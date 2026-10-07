import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { proteinIdeas } from '../lib/proteinIdeas'
import { Icon } from './Icon'
import '../screens/eat-out.css'

export function HomeProteinIdeas({ remaining, calorieRemaining, date, lowCarb }: { remaining: number; calorieRemaining: number; date: string; lowCarb: boolean }) {
  const [dairy, setDairy] = useState(true)
  const nav = useNavigate()
  const plan = proteinIdeas(remaining, dairy && !lowCarb)
  const excess = Math.max(0, plan.kcal - Math.max(0, calorieRemaining))
  const eatOut = <button type="button" className="protein-idea-eat-out" onClick={() => nav(`/eat-out?date=${date}`)}>Makan luar? Find a place nearby<Icon name="arrow_forward" size={17} /></button>
  return <details className="home-protein-help"><summary><Icon name="lightbulb" size={18} /><span>{remaining > 0 ? `${remaining} g protein left. Build a food combo.` : 'Protein target reached. No extra needed.'}</span><Icon name="expand_more" size={18} /></summary><div>{remaining <= 0 ? <p>Your logged meals already cover your protein target. You don’t need another protein portion just to close a ring.</p> : <><p>A portion combination covering your remaining {remaining} g. Spread it across meals—not all at once.</p>{!lowCarb && remaining > 80 && <div className="protein-idea-options" role="group" aria-label="Protein food combination"><button type="button" aria-pressed={dairy} onClick={() => setDairy(true)}>With yogurt</button><button type="button" aria-pressed={!dairy} onClick={() => setDairy(false)}>No dairy</button></div>}<ul>{plan.items.map(item => <li key={item.name}><span>{item.portion}</span><strong>≈{Math.round(item.protein * 10) / 10} g</strong></li>)}</ul><div className="protein-idea-total"><strong>≈{plan.protein} g protein</strong><span>≈{plan.kcal} kcal · {plan.carbs} g carbs · {plan.fat} g fat</span></div><p className="protein-idea-result">Your {remaining} g gap covered, with ≈{Math.max(0, Math.round((plan.protein - remaining) * 10) / 10)} g extra.</p>{excess > 0 && <p className="protein-idea-warning">This combination is ≈{excess} kcal above your remaining calorie budget. It is an example, not a recommendation to exceed your budget just to finish a ring. Review your portions or target.</p>}<small>Estimates from FitCore’s local food reference. Cooked weight; oils, sauces and brands change the numbers. Choose halal ingredients and vendors. Check other dietary needs before eating.</small><button type="button" className="protein-idea-log" onClick={() => nav(`/food?add=1&date=${date}`)}>Find & log what you eat<Icon name="arrow_forward" size={17} /></button><small>Suggestions are not logged automatically.</small></>}{eatOut}</div></details>
}
