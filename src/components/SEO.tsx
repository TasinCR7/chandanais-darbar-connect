import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
  type?: "website" | "article" | "profile";
}

const SITE_NAME = "চন্দনাইশ দরবার শরীফ";
const BASE_URL = "https://chandanaish-darbar.com"; // Updated to assuming a real domain or the provided one

const SEO = ({ title, description, canonical, keywords, type = "website" }: SEOProps) => {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const siteKeywords = keywords || "চন্দনাইশ দরবার শরীফ, দরবার শরীফ, মাইজভান্ডারী, সুফিবাদ, ইসলাম, চন্দনাইশ, চট্টগ্রাম, ওরশ, হাদিয়া, দোয়া আবেদন, Chandanaish Darbar Sharif, Maizbhandari, Sufism, Islam, Chattogram";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": SITE_NAME,
    "description": description,
    "url": url,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Chandananish",
      "addressRegion": "Chattogram",
      "addressCountry": "BD"
    }
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={siteKeywords} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={`${BASE_URL}/og-image.jpg`} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${BASE_URL}/og-image.jpg`} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default SEO;
