// Mascotte discreta del mondo magico: un pallone da beach volley col
// sorriso, ispirato al mare di Viareggio. Compare solo nei momenti di
// festa — mai come tutorial, mai invadente.
export default function Mascot({ size = 56, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <circle cx="50" cy="50" r="46" fill="#FF7A18" />
      <path d="M50 4 A46 46 0 0 1 96 50" stroke="#fff" strokeWidth="6" fill="none" />
      <path d="M50 4 A46 46 0 0 0 4 50" stroke="#0A1650" strokeWidth="6" fill="none" />
      <path d="M8 66 A46 46 0 0 0 50 96" stroke="#fff" strokeWidth="6" fill="none" />
      <path d="M50 96 A46 46 0 0 0 92 66" stroke="#0A1650" strokeWidth="6" fill="none" />
      <circle cx="37" cy="46" r="5" fill="#0A1650" />
      <circle cx="63" cy="46" r="5" fill="#0A1650" />
      <path d="M34 62 Q50 76 66 62" stroke="#0A1650" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
