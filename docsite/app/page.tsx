import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <div className="home-hero">
        <h1>DocDrift</h1>
        <p>
          Docs that never lie. Detect drift between merged code and
          documentation, then open low-noise, evidence-grounded remediation via
          Devin sessions.
        </p>
        <Link href="/docs/overview" className="cta">
          Get Started
        </Link>
      </div>
      <div className="home-features">
        <div className="feature-card">
          <h3>Automatic Detection</h3>
          <p>
            Detect documentation drift automatically when API specs or code
            paths change. Supports OpenAPI, GraphQL, Fern, and more.
          </p>
        </div>
        <div className="feature-card">
          <h3>AI-Powered Remediation</h3>
          <p>
            Devin sessions generate targeted PRs to fix documentation. High
            confidence changes are automated; low confidence triggers human
            review.
          </p>
        </div>
        <div className="feature-card">
          <h3>Low-Noise by Design</h3>
          <p>
            One session per docsite, PR caps, confidence gating, and idempotency
            keys prevent notification spam while keeping docs accurate.
          </p>
        </div>
        <div className="feature-card">
          <h3>CI/CD Integration</h3>
          <p>
            Runs as a GitHub Action on every merge to main. Documentation
            maintenance becomes a natural byproduct of development.
          </p>
        </div>
        <div className="feature-card">
          <h3>Multiple Ecosystems</h3>
          <p>
            Works with OpenAPI, FastAPI, GraphQL, Fern, Mintlify, Postman, and
            monorepos. Bring your own spec format.
          </p>
        </div>
        <div className="feature-card">
          <h3>SLA Enforcement</h3>
          <p>
            Configurable SLA reminders for stale doc-drift PRs. Never let
            documentation updates languish unreviewed.
          </p>
        </div>
      </div>
    </>
  );
}
