import CertificateVerificationV2 from './CertificateVerificationV2'

type PageProps = {
  params: {
    certificateId: string
  }
}

export default function CertificateVerificationPage({ params }: PageProps) {
  return <CertificateVerificationV2 certificateId={params.certificateId} />
}
