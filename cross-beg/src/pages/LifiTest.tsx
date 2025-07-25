import { LifiTestComponent } from '@/components/LifiTestComponent';

export function LifiTest() {
    return (
        <div className="min-h-screen bg-background p-4">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Li.Fi Integration Test</h1>
                    <p className="text-muted-foreground">
                        Test cross-chain transfers using Li.Fi protocol
                    </p>
                </div>

                <div className="flex justify-center">
                    <LifiTestComponent />
                </div>

                <div className="mt-8 p-6 rounded-lg border bg-card">
                    <h2 className="text-xl font-semibold mb-4">How it works:</h2>
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">1</span>
                            <p>Connect your wallet to enable cross-chain transfers</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">2</span>
                            <p>Select source and destination chains and tokens</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">3</span>
                            <p>Enter the amount you want to transfer</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">4</span>
                            <p>Get a quote from Li.Fi to see fees and expected output</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">5</span>
                            <p>Execute the transfer - Li.Fi will handle the cross-chain bridge</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">🔧 Integration Features:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Automatic token allowance management</li>
                        <li>• Real-time fee estimation</li>
                        <li>• Transfer status monitoring</li>
                        <li>• Support for multiple chains and tokens</li>
                        <li>• Error handling and user feedback</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
