import { NextRequest, NextResponse } from 'next/server';
import { connectToDb } from '@/app/lib/mongodb';
import Product from '@/app/models/Product';

// In-memory cache for suggestions
const suggestionsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `suggestions_${normalizedQuery}`;

    // Check cache
    const cached = suggestionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        suggestions: cached.data,
        cached: true,
      });
    }

    await connectToDb();

    // Get suggestions from multiple sources
    const [productTitles, brands, categories] = await Promise.all([
      // Product titles
      Product.find({
        productTitle: { $regex: `^${normalizedQuery}`, $options: 'i' }
      })
        .select('productTitle')
        .limit(5)
        .lean(),
      
      // Brands
      Product.distinct('brand', {
        brand: { $regex: `^${normalizedQuery}`, $options: 'i' }
      }).limit(3),
      
      // Categories (if you have a Category model, adjust accordingly)
      Product.aggregate([
        {
          $match: {
            $or: [
              { 'category.name': { $regex: normalizedQuery, $options: 'i' } }
            ]
          }
        },
        {
          $group: {
            _id: '$category.name',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ])
    ]);

    // Format suggestions
    const suggestions = [
      ...productTitles.map(p => ({
        type: 'product',
        text: p.productTitle,
        value: p.productTitle,
      })),
      ...brands.map(b => ({
        type: 'brand',
        text: b,
        value: b,
      })),
      ...categories.map(c => ({
        type: 'category',
        text: c._id,
        value: c._id,
      })),
    ].slice(0, 8);

    // Cache results
    suggestionsCache.set(cacheKey, {
      data: suggestions,
      timestamp: Date.now(),
    });

    // Cleanup old cache
    if (suggestionsCache.size > 500) {
      const entries = Array.from(suggestionsCache.entries());
      entries.slice(0, 250).forEach(([key]) => suggestionsCache.delete(key));
    }

    return NextResponse.json({
      suggestions,
      cached: false,
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
