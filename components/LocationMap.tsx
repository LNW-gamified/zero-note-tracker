export default function LocationMap({ address }: { address: string }) {
  return (
    <div className="mt-2 overflow-hidden rounded-sm border border-ink/20">
      <iframe
        src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`}
        className="h-28 w-full border-0"
        loading="lazy"
        title={`Map of ${address}`}
      />
    </div>
  );
}
