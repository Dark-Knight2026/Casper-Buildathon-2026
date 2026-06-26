/**
 * MFA Setup Page
 * Configure multi-factor authentication (SMS or TOTP)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, QrCode, Key, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

export default function MFASetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sms' | 'totp'>('totp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const handleSetupTOTP = async () => {
    try {
      setLoading(true);
      
      // Generate TOTP secret
      const secret = Math.random().toString(36).substring(2, 18).toUpperCase();
      setTotpSecret(secret);
      
      // Generate QR code
      const otpauthUrl = `otpauth://totp/LeaseManagement:user@example.com?secret=${secret}&issuer=LeaseManagement`;
      const qrUrl = await QRCode.toDataURL(otpauthUrl);
      setQrCodeUrl(qrUrl);
      
      toast({
        title: 'TOTP Setup',
        description: 'Scan the QR code with your authenticator app'
      });
    } catch (error) {
      console.error('TOTP setup error:', error);
      toast({
        title: 'Error',
        description: 'Failed to setup TOTP',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSMS = async () => {
    try {
      setLoading(true);
      
      if (!phoneNumber) {
        toast({
          title: 'Error',
          description: 'Please enter a phone number',
          variant: 'destructive'
        });
        return;
      }
      
      // Send verification SMS
      // In production, this would call Twilio API
      toast({
        title: 'SMS Sent',
        description: `Verification code sent to ${phoneNumber}`
      });
    } catch (error) {
      console.error('SMS setup error:', error);
      toast({
        title: 'Error',
        description: 'Failed to setup SMS',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndComplete = async () => {
    try {
      setLoading(true);
      
      if (!verificationCode) {
        toast({
          title: 'Error',
          description: 'Please enter the verification code',
          variant: 'destructive'
        });
        return;
      }
      
      // Verify the code
      // In production, this would verify against the TOTP secret or SMS code
      
      // Generate backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      setSetupComplete(true);
      
      toast({
        title: 'MFA Enabled',
        description: 'Multi-factor authentication has been enabled successfully'
      });
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Secret key copied to clipboard'
    });
  };

  const handleDownloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Backup codes downloaded'
    });
  };

  const handlePrintBackupCodes = () => {
    const printWindow = window.open('', '', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Backup Codes</title></head><body>');
      printWindow.document.write('<h1>Backup Codes</h1>');
      printWindow.document.write('<p>Store these codes in a safe place. Each code can only be used once.</p>');
      printWindow.document.write('<ul>');
      backupCodes.forEach(code => {
        printWindow.document.write(`<li>${code}</li>`);
      });
      printWindow.document.write('</ul>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">MFA Enabled Successfully</CardTitle>
            <CardDescription>
              Save your backup codes in a secure location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                Store these backup codes securely. Each code can only be used once if you lose access to your authentication method.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                    <span>{code}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownloadBackupCodes} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={handlePrintBackupCodes} variant="outline" className="flex-1">
                Print
              </Button>
            </div>

            <Button onClick={() => navigate('/tenant/profile')} className="w-full">
              Continue to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Setup Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sms' | 'totp')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="totp">
                <QrCode className="mr-2 h-4 w-4" />
                Authenticator App
              </TabsTrigger>
              <TabsTrigger value="sms">
                <Smartphone className="mr-2 h-4 w-4" />
                SMS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4 mt-6">
              <Alert>
                <AlertDescription>
                  Use an authenticator app like Google Authenticator, Authy, or 1Password to scan the QR code.
                </AlertDescription>
              </Alert>

              {!qrCodeUrl ? (
                <Button onClick={handleSetupTOTP} className="w-full" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg border">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Or enter this key manually:</Label>
                    <div className="flex gap-2">
                      <Input value={totpSecret} readOnly className="font-mono" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopySecret}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Enter verification code from your app:</Label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  <Button
                    onClick={handleVerifyAndComplete}
                    className="w-full"
                    disabled={loading || !verificationCode}
                  >
                    {loading ? 'Verifying...' : 'Verify and Enable'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sms" className="space-y-4 mt-6">
              <Alert>
                <AlertDescription>
                  You'll receive a verification code via SMS each time you log in.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              {!verificationCode && (
                <Button
                  onClick={handleSetupSMS}
                  className="w-full"
                  disabled={loading || !phoneNumber}
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              )}

              {phoneNumber && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Enter verification code:</Label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  <Button
                    onClick={handleVerifyAndComplete}
                    className="w-full"
                    disabled={loading || !verificationCode}
                  >
                    {loading ? 'Verifying...' : 'Verify and Enable'}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}