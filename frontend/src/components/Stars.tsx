// Pinta una nota de 0.5 a 5 como estrellas: una capa verde recortada al
// porcentaje de la nota encima de cinco estrellas apagadas.
export default function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" title={`${rating} de 5`}>
      <span className="stars-fill" style={{ width: `${(rating / 5) * 100}%` }}>
        ★★★★★
      </span>
      ★★★★★
    </span>
  );
}
