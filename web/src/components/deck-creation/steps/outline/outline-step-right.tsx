export function OutlineStepRight() {
    return (
        <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Outline Preview</h2>
            <div className="text-muted-foreground mb-8">
                Review the generated outline. Each section will be used to create flashcards.
                You can regenerate the outline if you want to try a different organization.
            </div>
            <div className="border rounded-lg p-4 bg-card">
                <h3 className="font-medium mb-2">Tips for reviewing:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Check if all important topics are covered</li>
                    <li>• Ensure the organization makes logical sense</li>
                    <li>• Look for any missing prerequisites</li>
                    <li>• Verify the depth of coverage is appropriate</li>
                </ul>
            </div>
        </div>
    );
} 