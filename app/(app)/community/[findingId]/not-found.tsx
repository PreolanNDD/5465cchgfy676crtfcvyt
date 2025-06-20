import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/community">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
          </Link>
          <h1 className="font-heading text-3xl text-primary-text">Finding Not Found</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-heading text-xl text-primary-text mb-2">Finding Not Found</h3>
              <p className="text-secondary-text mb-6">
                The finding you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/community">
                <Button>
                  Back to Community
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}