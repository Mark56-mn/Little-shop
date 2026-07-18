const fs = require('fs');
let code = fs.readFileSync('src/routes/product.$id.tsx', 'utf8');

code = code.replace(
  'import { getProduct, getSettings } from "@/lib/shop.functions";',
  `import { getProduct, getSettings } from "@/lib/shop.functions";\nimport { askAiAboutProduct } from "@/lib/ai.functions";`
);

code = code.replace(
  'const [error, setError] = useState<string | null>(null);',
  `const [error, setError] = useState<string | null>(null);\n  const [aiQuestion, setAiQuestion] = useState("");\n  const [aiAnswer, setAiAnswer] = useState<string | null>(null);\n  const [askingAi, setAskingAi] = useState(false);\n  const askAiFn = useServerFn(askAiAboutProduct);`
);

const aiSection = `
          {/* Ask AI Section */}
          <div className="mt-6 rounded-xl border border-neon/30 bg-neon/5 p-4">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold text-neon">
              <Zap className="h-4 w-4" /> Ask AI about this product
            </h3>
            <div className="mt-2 flex gap-2">
              <input
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                placeholder="Does this work with iPhone?"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                disabled={askingAi || !aiQuestion.trim()}
                onClick={async () => {
                  setAskingAi(true);
                  try {
                    const res = await askAiFn({ data: { question: aiQuestion, productDetails: product } });
                    setAiAnswer(res.answer);
                  } catch (e) {
                    setAiAnswer("Sorry, AI is currently unavailable.");
                  } finally {
                    setAskingAi(false);
                  }
                }}
                className="rounded-md bg-neon px-4 py-2 text-sm font-bold text-neon-foreground disabled:opacity-50"
              >
                {askingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
              </button>
            </div>
            {aiAnswer && (
              <div className="mt-3 rounded-md bg-background/50 p-3 text-sm text-foreground">
                {aiAnswer}
              </div>
            )}
          </div>
`;

code = code.replace(
  '{!user && showGuest && (',
  aiSection + '\n          {!user && showGuest && ('
);

fs.writeFileSync('src/routes/product.$id.tsx', code);
