import { notFound } from 'next/navigation';
import { getCommunityFindingById } from '@/lib/community';
import { FindingDetailClient } from './finding-detail-client';

// Force this page to always fetch fresh data - never use cache
export const revalidate = 0;

// Make this page dynamic to avoid build-time data fetching issues
export const dynamic = 'force-dynamic';

interface FindingDetailPageProps {
  params: {
    findingId: string;
  };
}

// This is now a Server Component that handles data fetching
export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { findingId } = params;

  console.log(`🎯 FindingDetailPage called with findingId: ${findingId}`);

  // Fetch the finding data on the server
  const finding = await getCommunityFindingById(findingId);

  // If finding doesn't exist, show 404
  if (!finding) {
    console.log(`❌ Finding not found for ID: ${findingId}`);
    notFound();
  }

  console.log(`✅ Finding found for ID: ${findingId}, title: ${finding.title}`);

  // Render the Client Component with the fetched data
  return <FindingDetailClient initialFinding={finding} />;
}