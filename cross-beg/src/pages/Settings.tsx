import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Settings() {
  const navigate = useNavigate();
  const { disconnectWallet } = useWallet();
  const { theme } = useTheme();

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Theme Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground">
                      Currently using {theme} mode
                    </p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Disconnect Wallet</p>
                    <p className="text-sm text-muted-foreground">
                      Sign out of your current wallet
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>About CrossBeg</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    CrossBeg is a social payments protocol that lets you safely request 
                    and receive money from anyone across any blockchain using just a 
                    username or wallet address.
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Version 1.0.0
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}