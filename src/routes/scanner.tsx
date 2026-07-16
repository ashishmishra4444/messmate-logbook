import { createFileRoute } from '@tanstack/react-router';
import { ScannerPage } from '@/components/scanner/ScannerPage';

export const Route = createFileRoute('/scanner')({
  component: () => (
    <ScannerPage />
  ),
});
