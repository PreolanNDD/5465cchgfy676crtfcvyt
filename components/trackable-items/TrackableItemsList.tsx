'use client';

import { useState } from 'react';
import { TrackableItem } from '@/lib/types';
import { updateTrackableItem, deleteTrackableItem } from '@/lib/trackable-items';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Target, TrendingUp } from 'lucide-react';

interface TrackableItemsListProps {
  items: TrackableItem[];
  onUpdate: () => void;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  'SCALE_1_10': 'Scale (1-10)',
  'NUMERIC': 'Number',
  'BOOLEAN': 'Yes/No',
  'TEXT': 'Text'
};

export function TrackableItemsList({ items, onUpdate }: TrackableItemsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTrackableItem(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    return category === 'INPUT' ? Target : TrendingUp;
  };

  const getCategoryColor = (category: string) => {
    return category === 'INPUT' ? 'bg-accent-1' : 'bg-accent-2';
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-secondary-text">
            No metrics created yet. Add your first metric to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const CategoryIcon = getCategoryIcon(item.category);
        
        return (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`w-8 h-8 ${getCategoryColor(item.category)} rounded-lg flex items-center justify-center`}>
                    <CategoryIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-primary-text">{item.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {DATA_TYPE_LABELS[item.type]}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-secondary-text hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    loading={deletingId === item.id}
                    className="h-8 w-8 p-0 text-secondary-text hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}