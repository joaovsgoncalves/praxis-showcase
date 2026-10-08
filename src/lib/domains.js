// Domain → semantic color binding. Use the domain class on a Card to enable
// the hover-glow + accent border defined by `.card-domain` in index.css.
//
// Pair with `card-domain` className. Example:
//   <Card className="card-domain domain-focus">
export const DOMAINS = {
  ember:    { className: 'domain-ember',    hex: 'hsl(22 95% 58%)' },
  gold:     { className: 'domain-gold',     hex: 'hsl(40 95% 55%)' },
  focus:    { className: 'domain-focus',    hex: 'hsl(265 85% 65%)' },
  wellness: { className: 'domain-wellness', hex: 'hsl(160 80% 50%)' },
  sky:      { className: 'domain-sky',      hex: 'hsl(200 85% 60%)' },
  pink:     { className: 'domain-pink',     hex: 'hsl(330 80% 65%)' },
};

export function domain(name) {
  return DOMAINS[name]?.className || 'domain-focus';
}
