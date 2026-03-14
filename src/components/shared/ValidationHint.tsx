export function ValidationHint({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <p style={{ color: "var(--danger)", marginTop: 12 }}>{message}</p>;
}
