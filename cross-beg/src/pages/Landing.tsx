import { useNavigate } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wallet, Zap, Shield, Globe } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { connectWallet } = useWallet();

  const handleConnect = async () => {
    await connectWallet();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <h1 className="text-2xl font-bold">CrossBeg</h1>
        <div className="flex items-center gap-3">
          <Button onClick={handleConnect} variant="default" size="default">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-6 py-4 text-center">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Cross-chain payments,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              simplified.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-16 max-w-2xl mx-auto">
            Request and receive money from anyone across any blockchain using
            just a username or wallet address. Safe, social, and incredibly
            simple.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="p-6 rounded-xl border bg-card shadow-subtle">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Cross-Chain</h3>
              <p className="text-sm text-muted-foreground">
                Send payments across any blockchain seamlessly
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card shadow-subtle">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Secure</h3>
              <p className="text-sm text-muted-foreground">
                Built on proven protocols with maximum security
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card shadow-subtle">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Instant</h3>
              <p className="text-sm text-muted-foreground">
                Fast transactions with real-time notifications
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
