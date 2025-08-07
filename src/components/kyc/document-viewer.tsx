'use client';

import { useState } from 'react';
import { Eye, Download, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  documentType: string;
  className?: string;
}

export function DocumentViewer({ 
  documentUrl, 
  documentName, 
  documentType,
  className 
}: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Check if it's an image
  const isImage = documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  // Check if it's a PDF
  const isPdf = documentUrl.match(/\.pdf$/i);

  const handleDownload = async () => {
    try {
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetView = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
        >
          <Eye className="h-4 w-4 mr-2" />
          Visualizar
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {documentName}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetView}
                  >
                    Reset
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-center items-center min-h-[400px]">
            {isImage ? (
              <div 
                className="relative transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              >
                <Image
                  src={documentUrl}
                  alt={documentName}
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ) : isPdf ? (
              <div className="w-full h-[600px] border rounded-lg">
                <iframe
                  src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full rounded-lg"
                  title={documentName}
                />
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-semibold mb-2">
                  Visualização não disponível
                </h3>
                <p className="text-gray-600 mb-4">
                  Este tipo de arquivo não pode ser visualizado no navegador.
                </p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Fazer Download
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Document Info */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">Tipo:</span> {documentType}
            </div>
            <div>
              <span className="font-medium">Arquivo:</span> {documentName}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
