import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardPreferences, DashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { Download, Upload, Copy, Check, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DashboardExportImport() {
  const { preferences, updateTheme, updateLayout, toggleCompactMode, toggleAnimations } = useDashboardPreferences();
  const { toast } = useToast();
  const [importData, setImportData] = useState('');
  const [copied, setCopied] = useState(false);

  const exportConfig = () => {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      preferences: preferences
    };
    
    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `landlord-dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Configuration Exported',
      description: 'Your dashboard configuration has been downloaded as a JSON file.'
    });
  };

  const copyToClipboard = () => {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      preferences: preferences
    };
    
    const jsonString = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(jsonString);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: 'Copied to Clipboard',
      description: 'Configuration has been copied. You can paste it to share with others.'
    });
  };

  const importConfig = () => {
    try {
      const config = JSON.parse(importData);
      
      if (!config.version || !config.preferences) {
        throw new Error('Invalid configuration format');
      }

      const prefs = config.preferences as DashboardPreferences;
      
      // Apply imported preferences
      if (prefs.theme) {
        updateTheme(prefs.theme);
      }
      
      if (prefs.layout) {
        updateLayout(prefs.layout);
      }
      
      if (prefs.compactMode !== undefined && prefs.compactMode !== preferences.compactMode) {
        toggleCompactMode();
      }
      
      if (prefs.animationsEnabled !== undefined && prefs.animationsEnabled !== preferences.animationsEnabled) {
        toggleAnimations();
      }

      toast({
        title: 'Configuration Imported',
        description: 'Your dashboard has been configured with the imported settings.'
      });
      
      setImportData('');
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Invalid configuration format. Please check your JSON and try again.',
        variant: 'destructive'
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Export & Import Configuration</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Save your dashboard configuration to share with team members or backup your settings.
        </p>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Export your current dashboard configuration as a JSON file. You can share this file with colleagues or use it to restore your settings on another device.
          </p>
          
          <div className="flex gap-2">
            <Button onClick={exportConfig} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download JSON File
            </Button>
            <Button onClick={copyToClipboard} variant="outline" className="flex-1">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start gap-2">
              <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Current Configuration
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Theme: {preferences.theme} • 
                  Widgets: {preferences.layout.widgets.filter(w => w.enabled).length}/{preferences.layout.widgets.length} enabled • 
                  Compact: {preferences.compactMode ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Import a dashboard configuration from a JSON file or paste the configuration data directly.
          </p>

          <div>
            <Label htmlFor="file-upload">Upload JSON File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="mt-2"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">
                Or paste JSON
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="import-data">Configuration JSON</Label>
            <Textarea
              id="import-data"
              placeholder='Paste your configuration JSON here...'
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="mt-2 font-mono text-xs"
              rows={8}
            />
          </div>

          <Button
            onClick={importConfig}
            disabled={!importData.trim()}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Configuration
          </Button>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-yellow-900 dark:text-yellow-100">
              <strong>Note:</strong> Importing a configuration will overwrite your current dashboard settings. Make sure to export your current configuration first if you want to keep it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}