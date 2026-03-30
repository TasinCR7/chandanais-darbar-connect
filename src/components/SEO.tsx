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
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const siteKeywords = keywords || "চন্দনাইশ দরবার শরীফ, দরবার শরীফ, মাইজভান্ডারী, গাউছে জামান আবদুল লতিফ শাহ, সুফিবাদ, ইসলাম, চন্দনাইশ, চট্টগ্রাম, ওরশ, হাদিয়া, দোয়া আবেদন, Chandanaish Darbar Sharif, Maizbhandari, Sufism, Islam, Chattogram, Best Darbar Sharif in Chittagong, Spiritual Center Bangladesh";
  const ogImage = `${BASE_URL}/logo.png`; 

  // Combined Schema Markups
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ReligiousOrganization",
      "name": SITE_NAME,
      "alternateName": ["Chandanaish Darbar Sharif", "চন্দনাইশ দরবার শরীফ", "Maizbhandari Darbar Sharif Chandanaish"],
      "description": description,
      "url": url,
      "logo": `${BASE_URL}/logo.png`,
      "image": `${BASE_URL}/darbar-mazar.png`,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Chandanaish Darbar Sharif",
        "addressLocality": "Chandanaish",
        "addressRegion": "Chattogram",
        "addressCountry": "BD"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+8801819385557",
        "contactType": "religious service"
      },
      "sameAs": [
        "https://www.facebook.com/ChandanaishDarbar",
        "https://www.youtube.com/@ChandanaishDarbar"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": SITE_NAME,
      "url": BASE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${BASE_URL}/?s={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    }
  ];

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
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default SEO;
