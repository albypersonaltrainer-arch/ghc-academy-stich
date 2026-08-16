import CertificateVerificationV2 from './CertificateVerificationV2'

type PageProps = {
  params: Promise<{
    certificateId: string
  }>
}

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { certificateId } = await params
  return <CertificateVerificationV2 certificateId={certificateId} />
}
