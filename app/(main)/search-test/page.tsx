'use client';

import { useState } from 'react';
import SearchBar from '@/app/components/SearchBar';
import { useSearch } from '@/app/hooks/useSearch';

export default function SearchTestPage() {
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = useSearch({ query }, !!query);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Test Page
          </h1>
          <p className="text-gray-600 mb-8">
            Test your search functionality here
          </p>

          {/* Search Bar */}
          <div className="mb-8">
            <SearchBar onSearch={setQuery} />
          </div>

          {/* Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Status:</h2>
            <div className="bg-gray-50 rounded p-4 space-y-2">
              <p>
                <span className="font-medium">Query:</span>{' '}
                {query || 'No query yet'}
              </p>
              <p>
                <span className="font-medium">Loading:</span>{' '}
                {isLoading ? '✅ Yes' : '❌ No'}
              </p>
              <p>
                <span className="font-medium">Error:</span>{' '}
                {error ? '❌ Yes' : '✅ No'}
              </p>
              <p>
                <span className="font-medium">Results:</span>{' '}
                {data?.total || 0} products
              </p>
              {data?.cached && (
                <p className="text-blue-600">
                  ⚡ Results served from cache
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Error:</h3>
              <pre className="text-sm text-red-700 overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}

          {/* Results */}
          {query && !isLoading && !error && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Results ({data?.total || 0}):
              </h2>
              
              {data?.products && data.products.length > 0 ? (
                <div className="space-y-4">
                  {data.products.slice(0, 5).map((product: any) => (
                    <div
                      key={product._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex gap-4">
                        <img
                          src={product.images?.[0] || '/placeholder.png'}
                          alt={product.productTitle}
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {product.productTitle}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {product.brand}
                          </p>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-gray-900">
                              ${product.price}
                            </span>
                            {product.inventory?.quantity > 0 ? (
                              <span className="text-sm text-green-600">
                                In Stock ({product.inventory.quantity})
                              </span>
                            ) : (
                              <span className="text-sm text-red-600">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          {product._relevanceScore && (
                            <p className="text-xs text-gray-500 mt-2">
                              Relevance Score: {product._relevanceScore.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {data.products.length > 5 && (
                    <p className="text-center text-gray-600 py-4">
                      ... and {data.products.length - 5} more results
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No products found</p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4">
              Testing Instructions:
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Make sure MongoDB is connected (check .env.local)</li>
              <li>Ensure you have products in your database</li>
              <li>Try searching for a product name, brand, or category</li>
              <li>Check the status section for any errors</li>
              <li>Verify results are displayed correctly</li>
            </ol>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Quick Checks:
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>✅ MongoDB connection string in .env.local</li>
                <li>✅ Product model matches your schema</li>
                <li>✅ Database has products</li>
                <li>✅ API routes are accessible</li>
              </ul>
            </div>
          </div>

          {/* API Test */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">
              Direct API Test:
            </h2>
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-600 mb-2">
                Test the API directly:
              </p>
              <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block overflow-x-auto">
                GET /api/search/products?query=test
              </code>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/search/products?query=test');
                    const data = await res.json();
                    console.log('API Response:', data);
                    alert(`API returned ${data.total || 0} products. Check console for details.`);
                  } catch (err) {
                    console.error('API Error:', err);
                    alert('API call failed. Check console for details.');
                  }
                }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test API Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
