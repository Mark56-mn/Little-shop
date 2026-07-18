'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  importSingleProduct,
  importMultipleProducts,
  fetchImportedProducts,
  deleteImportedProduct,
  updateImportedProduct
} from '@/lib/wap-import.functions';
import { Loader2, Trash2, Edit2, CheckCircle, AlertCircle, Copy } from 'lucide-react';

interface ImportedProduct {
  id: string;
  product_name: string;
  description: string;
  price: number;
  image_url: string;
  platform: string;
  source_url: string;
  status: string;
  created_at: string;
}

export function WAPContainer() {
  const [singleUrl, setSingleUrl] = useState('');
  const [batchContent, setBatchContent] = useState('');
  const [isCsvMode, setIsCsvMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ImportedProduct>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch imported products
  const { data: productsResponse, refetch: refetchProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['imported-products'],
    queryFn: async () => {
      const result = await fetchImportedProducts();
      if (result.success) {
        return result.importedProducts || [];
      }
      throw new Error(result.error || 'Failed to fetch products');
    }
  });

  const products = productsResponse || [];

  // Single product import mutation
  const singleImportMutation = useMutation({
    mutationFn: async (url: string) => {
      const result = await importSingleProduct({ url } as any);
      if (!result.success) throw new Error(result.error);
      return result.importedData;
    },
    onSuccess: () => {
      setSingleUrl('');
      setSuccessMessage('Product imported successfully!');
      refetchProducts();
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  // Batch import mutation
  const batchImportMutation = useMutation({
    mutationFn: async (content: string) => {
      const result = await importMultipleProducts({ content, isCSV: isCsvMode } as any);
      if (!result.success) throw new Error(result.error);
      return result.results;
    },
    onSuccess: (results) => {
      const successCount = results?.filter((r: any) => r.status === 'success').length || 0;
      setSuccessMessage(`Successfully imported ${successCount} products!`);
      setBatchContent('');
      refetchProducts();
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteImportedProduct({ id } as any);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      refetchProducts();
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await updateImportedProduct({
        id,
        productName: editData.product_name,
        description: editData.description,
        price: editData.price,
        imageUrl: editData.image_url
      } as any);
      if (!result.success) throw new Error(result.error);
      return result.updatedData;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditData({});
      refetchProducts();
    }
  });

  const handleSingleImport = async () => {
    if (singleUrl.trim()) {
      await singleImportMutation.mutateAsync(singleUrl);
    }
  };

  const handleBatchImport = async () => {
    if (batchContent.trim()) {
      await batchImportMutation.mutateAsync(batchContent);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this imported product?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const startEditing = (product: any) => {
    setEditingId(product.id);
    setEditData(product);
  };

  const saveEdit = async () => {
    if (editingId) {
      await updateMutation.mutateAsync(editingId);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Import</TabsTrigger>
          <TabsTrigger value="batch">Batch Import</TabsTrigger>
        </TabsList>

        {/* Single Import Tab */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Single Product</CardTitle>
              <CardDescription>
                Paste a product link from AliExpress, Temu, Amazon, or any e-commerce site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="https://example.com/product/..."
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSingleImport();
                }}
                disabled={singleImportMutation.isPending}
              />
              <Button
                onClick={handleSingleImport}
                disabled={!singleUrl.trim() || singleImportMutation.isPending}
                className="w-full"
              >
                {singleImportMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Import Product
              </Button>
              {singleImportMutation.isError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {(singleImportMutation.error as Error)?.message || 'Import failed'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Import Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Multiple Products</CardTitle>
              <CardDescription>
                Paste multiple product URLs (one per line) or CSV data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={!isCsvMode ? 'default' : 'outline'}
                  onClick={() => setIsCsvMode(false)}
                  className="flex-1"
                >
                  URL List
                </Button>
                <Button
                  variant={isCsvMode ? 'default' : 'outline'}
                  onClick={() => setIsCsvMode(true)}
                  className="flex-1"
                >
                  CSV Format
                </Button>
              </div>

              <Textarea
                placeholder={
                  isCsvMode
                    ? 'URL,Product Name,Price\nhttps://example.com/product1,...\nhttps://example.com/product2,...'
                    : 'https://example.com/product1\nhttps://example.com/product2\nhttps://example.com/product3'
                }
                value={batchContent}
                onChange={(e) => setBatchContent(e.target.value)}
                rows={6}
                disabled={batchImportMutation.isPending}
              />

              <Button
                onClick={handleBatchImport}
                disabled={!batchContent.trim() || batchImportMutation.isPending}
                className="w-full"
              >
                {batchImportMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Import Batch
              </Button>

              {batchImportMutation.isError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {(batchImportMutation.error as Error)?.message || 'Import failed'}
                  </AlertDescription>
                </Alert>
              )}

              {batchImportMutation.data && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Import Results:</p>
                  {batchImportMutation.data.map((result: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="truncate">{result.url}</span>
                      {result.status === 'success' ? (
                        <Badge variant="default" className="bg-green-600">Success</Badge>
                      ) : (
                        <Badge variant="destructive">{result.error}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Imported Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Imported Products</CardTitle>
          <CardDescription>
            {products.length} product{products.length !== 1 ? 's' : ''} imported
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No products imported yet</p>
          ) : (
            <div className="space-y-4">
              {products.map((product: any) => (
                <div key={product.id} className="border rounded-lg p-4 space-y-3">
                  {editingId === product.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <Input
                        value={editData.product_name || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, product_name: e.target.value })
                        }
                        placeholder="Product name"
                      />
                      <Textarea
                        value={editData.description || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, description: e.target.value })
                        }
                        placeholder="Description"
                        rows={3}
                      />
                      <Input
                        type="number"
                        value={editData.price || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, price: parseFloat(e.target.value) })
                        }
                        placeholder="Price"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={saveEdit}
                          disabled={updateMutation.isPending}
                          className="flex-1"
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{product.product_name}</h3>
                            <Badge variant="secondary">{product.platform}</Badge>
                            <Badge
                              variant={product.status === 'imported' ? 'default' : 'outline'}
                            >
                              {product.status}
                            </Badge>
                          </div>

                          {product.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {product.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            {product.price && (
                              <span className="font-medium">
                                ${product.price.toFixed(2)}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(product.source_url);
                                setSuccessMessage('URL copied to clipboard!');
                                setTimeout(() => setSuccessMessage(''), 2000);
                              }}
                              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                            >
                              <Copy className="h-4 w-4" />
                              Copy Link
                            </button>
                          </div>
                        </div>

                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="h-24 w-24 object-cover rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(product)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
