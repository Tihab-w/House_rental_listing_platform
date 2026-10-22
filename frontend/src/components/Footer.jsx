import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <Link to="/" className="brand">🏠 Rent<span>Ease</span></Link>
            <p className="tagline">
              Modern apartments. Prime locations. Better living.
              Book directly with verified owners.
            </p>
            <div className="social">
              <a href="#" aria-label="Facebook">f</a>
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="Twitter">𝕏</a>
              <a href="#" aria-label="LinkedIn">in</a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h5>Explore</h5>
            <ul>
              <li><Link to="/">Apartments</Link></li>
              <li><a href="#">Amenities</a></li>
              <li><a href="#">Neighborhoods</a></li>
              <li><a href="#">Move-in Guide</a></li>
              <li><a href="#">Reviews</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h5>Resources</h5>
            <ul>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Rental Guide</a></li>
              <li><a href="#">Lease Terms</a></li>
              <li><a href="#">Resident Portal</a></li>
              <li><a href="#">Help Center</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5>Contact Us</h5>
            <div className="footer-contact-row">
              <span className="ico">📞</span>
              <span>(800) 123-4567</span>
            </div>
            <div className="footer-contact-row">
              <span className="ico">✉️</span>
              <span>hello@rentease.com</span>
            </div>
            <div className="footer-contact-row">
              <span className="ico">📍</span>
              <span>123 Urban Street<br />New York, NY 10001</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2025 RentEase. All rights reserved.</span>
          <div>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}