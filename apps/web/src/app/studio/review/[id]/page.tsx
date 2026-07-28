import { PublicReview } from '~/components/studio/PublicReview'

export default async function StudioReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PublicReview reviewId={id} />
}
