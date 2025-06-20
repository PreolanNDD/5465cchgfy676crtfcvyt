'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getTrackableItems } from '@/lib/trackable-items';
import { getLoggedEntriesForDate, upsertLoggedEntry } from '@/lib/logged-entries';
import { TrackableItem, LoggedEntryWithItem } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { LogEntryField } from '@/components/log/LogEntryField';
import { Calendar, Save, Target, TrendingUp } from 'lucide-react';

const getDefaultValue = (dataType: string) => {
  switch (dataType) {
    case 'BOOLEAN': return false;
    case 'TEXT': return '';
    case 'SCALE_1_10': return 5;
    case 'NUMERIC': return null;
    default: return null;
  }
};

export function DailyLogger({ trackableItems, loading }: { trackableItems: TrackableItem[]; loading: boolean }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => {
    const defaultDate = new Date().toISOString().split('T')[0];
    return defaultDate;
  });
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // NEW ROBUST USEEFFECT - Replace all existing data loading useEffect hooks with this single one
  useEffect(() => {
    // Depend only on stable values to prevent loops
    if (!user?.id || trackableItems.length === 0) {
      return;
    }

    let isCanceled = false; // Cleanup flag to prevent state updates on unmounted components

    const loadEntries = async () => {
      setLoadingEntries(true);
      setError('');
      
      try {
        const entries = await getLoggedEntriesForDate(user.id, selectedDate);
        
        if (isCanceled) {
          return; // Exit if the component has re-rendered for a new date
        }

        const newFormData: Record<string, any> = {};
        trackableItems.forEach(item => {
          const existingEntry = entries.find(e => e.trackable_item_id === item.id);
          if (existingEntry) {
            const value = existingEntry.numeric_value ?? existingEntry.text_value ?? existingEntry.boolean_value;
            newFormData[item.id] = value;
          } else {
            const defaultValue = getDefaultValue(item.type);
            newFormData[item.id] = defaultValue;
          }
        });
        
        if (!isCanceled) {
          setFormData(newFormData);
        }

      } catch (err: any) {
        if (!isCanceled) {
          setError('Failed to load entries.');
        }
      } finally {
        if (!isCanceled) {
          setLoadingEntries(false);
        }
      }
    };

    loadEntries();

    return () => {
      isCanceled = true;
    };
  }, [user?.id, selectedDate, trackableItems.length]); // Dependency array with only stable primitives

  const handleSave = useCallback(async () => {
    if (!user?.id || saving || trackableItems.length === 0) {
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const savePromises = trackableItems.map(item => {
        const value = formData[item.id];
        const entryData = {
          user_id: user.id,
          trackable_item_id: item.id,
          entry_date: selectedDate,
          numeric_value: (item.type === 'NUMERIC' || item.type === 'SCALE_1_10') ? (value !== '' && value !== null ? value : null) : null,
          text_value: item.type === 'TEXT' ? (value || null) : null,
          boolean_value: item.type === 'BOOLEAN' ? value : null,
        };
        return upsertLoggedEntry(entryData);
      });
      
      await Promise.all(savePromises);
      
      setMessage('All data saved successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage('');
      }, 3000);
      
    } catch (err: any) {
      setError(`Failed to save data: ${err.message}`);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setSaving(false);
    }
  }, [user?.id, saving, trackableItems, formData, selectedDate]);

  const handleFieldChange = useCallback((itemId: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [itemId]: value };
      return newData;
    });
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    
    if (saving) {
      return;
    }
    
    setSelectedDate(newDate);
    setFormData({});
    setMessage('');
    setError('');
  }, [saving, selectedDate]);

  if (loading || loadingEntries) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Daily Logger Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-primary-text">Daily Logger</h2>
        <p className="text-secondary-text">Track your daily metrics and progress</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-primary-text mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {(message || error) && (
        <div className={`p-3 rounded-lg text-sm ${
          message 
            ? 'bg-green-50 border border-green-200 text-green-600' 
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <p>{message || error}</p>
        </div>
      )}

      {trackableItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-secondary-text mb-4">No metrics to track yet. Create some metrics first!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {trackableItems.filter(item => item.category === 'INPUT').length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 bg-accent-1 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-heading text-xl text-primary-text">Inputs</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {trackableItems.filter(item => item.category === 'INPUT').map(item => {
                  return (
                    <LogEntryField 
                      key={`${item.id}-${selectedDate}`} 
                      item={item} 
                      value={formData[item.id]} 
                      onChange={handleFieldChange}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}

          {trackableItems.filter(item => item.category === 'OUTPUT').length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-accent-2 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-heading text-xl text-primary-text">Outputs</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {trackableItems.filter(item => item.category === 'OUTPUT').map(item => {
                  return (
                    <LogEntryField 
                      key={`${item.id}-${selectedDate}`} 
                      item={item} 
                      value={formData[item.id]} 
                      onChange={handleFieldChange}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}
          
          <Button 
            onClick={() => {
              handleSave();
            }} 
            loading={saving} 
            className="w-full" 
            size="lg"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </>
      )}
    </div>
  );
}