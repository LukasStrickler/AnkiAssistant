export function CardsStepRight() {
    return (
        <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Card Review</h2>
            <div className="text-muted-foreground mb-8">
                Review each generated card. You can regenerate individual cards if needed.
                All cards must be complete before saving to Anki.
            </div>
            <div className="border rounded-lg p-4 bg-card">
                <h3 className="font-medium mb-2">Card Status Guide:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <span className="text-blue-500">Blue border</span> - Card is complete</li>
                    <li>• <span className="text-green-500">Green border</span> - Card is being generated</li>
                    <li>• <span className="opacity-50">Faded</span> - Card is pending generation</li>
                </ul>
                <h3 className="font-medium mt-4 mb-2">Review Tips:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Check for accuracy and clarity</li>
                    <li>• Ensure questions are specific</li>
                    <li>• Verify answers are complete</li>
                    <li>• Look for any formatting issues</li>
                </ul>
            </div>
        </div>
    );
} 