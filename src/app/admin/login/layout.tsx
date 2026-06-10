// Overrides parent admin layout (which has nav) so login page is standalone.
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
