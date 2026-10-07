import './meal-food-list.css'
/** Template portions are separated after their closing parenthesis, not inside food names. */
export function MealFoodList({ items }: { items: string }) {
  const foods = items.split(/(?<=\))[,;]\s*/)
  return <ul className="meal-food-points">{foods.map((food, i) => {
    const match = food.match(/^(.*?)\s*\(([^()]*)\)$/)
    return <li key={`${food}-${i}`}><span>{match?.[1] ?? food}</span>{match && <small>{match[2]}</small>}</li>
  })}</ul>
}
