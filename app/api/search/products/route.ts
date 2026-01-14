import { NextRequest, NextResponse } from 'next/server';
import { connectToDb } from '@/app/lib/mongodb';
import Product from '@/app/models/Product';

// Cache for search results (in-memory, resets on deployment)
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface SearchParams {
  query: string;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `search_${query.toLowerCase()}_${searchParams.toString()}`;
    const cached = searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        products: cached.data,
        cached: true,
        total: cached.data.length,
      });
    }

    // Parse additional filters
    const filters: SearchParams = {
      query: query.trim(),
      limit: parseInt(searchParams.get('limit') || '50'),
      category: searchParams.get('category') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      brand: searchParams.get('brand') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'relevance',
    };

    await connectToDb();

    // Build search query
    const searchQuery = buildSearchQuery(filters);
    
    // Execute search with populated fields
    let products = await Product.find(searchQuery)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('inventory', 'quantity')
      .limit(filters.limit!)
      .lean();

    // Calculate relevance scores and sort
    if (filters.sortBy === 'relevance') {
      products = rankByRelevance(products, filters.query);
    } else {
      products = applySorting(products, filters.sortBy);
    }

    // Cache the results
    searchCache.set(cacheKey, {
      data: products,
      timestamp: Date.now(),
    });

    // Clean old cache entries (simple cleanup)
    if (searchCache.size > 1000) {
      const entries = Array.from(searchCache.entries());
      entries.slice(0, 500).forEach(([key]) => searchCache.delete(key));
    }

    return NextResponse.json({
      products,
      total: products.length,
      query: filters.query,
      cached: false,
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'An error occurred while searching for products' },
      { status: 500 }
    );
  }
}

function buildSearchQuery(filters: SearchParams) {
  const { query, category, minPrice, maxPrice, brand } = filters;
  
  // Split query into words for better matching
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  
  // Create regex patterns for each word
  const regexPatterns = queryWords.map(word => new RegExp(word, 'i'));
  
  // Build the main search condition
  const searchConditions: any = {
    $and: regexPatterns.map(pattern => ({
      $or: [
        { productTitle: pattern },
        { description: pattern },
        { brand: pattern },
        { keyFeatures: pattern },
        { color: pattern },
        { mainMaterial: pattern },
      ],
    })),
  };

  // Add additional filters
  const additionalFilters: any[] = [];

  if (category) {
    // Category is an ObjectId reference, so we can't filter by name directly
    // You would need to pass the category ID instead
    additionalFilters.push({ category: category });
  }

  if (brand) {
    additionalFilters.push({ brand: new RegExp(brand, 'i') });
  }

  // Price filtering - convert string price to number for comparison
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: any = {};
    if (minPrice !== undefined) priceFilter.$gte = minPrice.toString();
    if (maxPrice !== undefined) priceFilter.$lte = maxPrice.toString();
    additionalFilters.push({ price: priceFilter });
  }

  if (additionalFilters.length > 0) {
    searchConditions.$and.push(...additionalFilters);
  }

  return searchConditions;
}

function rankByRelevance(products: any[], query: string): any[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  
  return products
    .map(product => {
      let score = 0;
      
      queryWords.forEach(word => {
        const pattern = new RegExp(word, 'i');
        const lowerWord = word.toLowerCase();
        
        // Exact title match (highest priority)
        if (product.productTitle?.toLowerCase().includes(lowerWord)) {
          score += product.productTitle.toLowerCase() === lowerWord ? 10 : 5;
        }
        
        // Title regex match
        if (pattern.test(product.productTitle)) score += 3;
        
        // Brand match
        if (product.brand && pattern.test(product.brand)) score += 2;
        
        // Category match
        if (product.category && pattern.test(product.category.name)) score += 2;
        
        // SubCategory match
        if (product.subCategory && pattern.test(product.subCategory.name)) score += 2;
        
        // Description match (lower priority)
        if (pattern.test(product.description)) score += 1;
        
        // Key features match
        if (product.keyFeatures && product.keyFeatures.some((feature: string) => pattern.test(feature))) {
          score += 2;
        }
        
        // Color match
        if (product.color && pattern.test(product.color)) score += 1;
        
        // Material match
        if (product.mainMaterial && pattern.test(product.mainMaterial)) score += 1;
      });
      
      // Boost in-stock products
      if (product.inventory && product.inventory.quantity > 0) {
        score += 0.5;
      }
      
      // Boost new products
      if (product.isProductNew) {
        score += 0.3;
      }
      
      return { ...product, _relevanceScore: score };
    })
    .filter(product => product._relevanceScore > 0)
    .sort((a, b) => b._relevanceScore - a._relevanceScore);
}

function applySorting(products: any[], sortBy: string): any[] {
  switch (sortBy) {
    case 'price_asc':
      return products.sort((a, b) => parseFloat(a.price || '0') - parseFloat(b.price || '0'));
    case 'price_desc':
      return products.sort((a, b) => parseFloat(b.price || '0') - parseFloat(a.price || '0'));
    case 'newest':
      return products.sort((a, b) => {
        const dateA = a.createdOn ? new Date(a.createdOn).getTime() : 0;
        const dateB = b.createdOn ? new Date(b.createdOn).getTime() : 0;
        return dateB - dateA;
      });
    default:
      return products;
  }
}
