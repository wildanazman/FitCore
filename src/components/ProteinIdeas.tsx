import './protein-ideas.css'

/** Portion examples are approximate; brands and preparation change the totals. */
export function ProteinIdeas({ target, eaten = 0 }: { target: number; eaten?: number }) {
  const remaining = Math.max(0, target - eaten)
  return <div className="protein-ideas">
    <div className="protein-ideas-heading"><strong>{target} g protein / day</strong><span>{remaining === 0 ? 'Target reached' : `${remaining} g left today`}</span></div>
    <p>Easy ways to build toward it:</p>
    <ul><li><span>150 g cooked chicken breast</span><strong>≈46 g</strong></li><li><span>2 large eggs</span><strong>≈12 g</strong></li><li><span>170 g plain Greek yogurt</span><strong>≈17 g</strong></li></ul>
    <small>Mix portions across meals. Protein values are estimates; check the food label when logging.</small>
  </div>
}
