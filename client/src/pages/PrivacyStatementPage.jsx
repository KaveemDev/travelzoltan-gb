import { Link } from 'react-router-dom';

const PrivacyStatementPage = () => {
  return (
    <div className="min-h-screen py-16 px-6 md:px-12 pt-30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-on-surface mb-8 font-headline">Privacy Statement</h1>
        
        <div className="space-y-6 text-slate-600 font-['Inter'] leading-relaxed">
          <p>We ensures that every transaction you conduct online is in a safe and secure environment. To achieve this, our website is protected by Secured Socket Layer (SSL) technology by E-Billing Solutions (EBS), the leaders in encryption technology. The process of encryption takes your credit card information and converts it into bits of code that are securely transmitted over the Internet. This scrambled data cannot be read as the information travels over the Internet. Your credit card details may be shared with our service providers or vendors to the extent deemed necessary.</p>

          <p>We want you to feel confident about using website to plan and purchase your travel tickets, so we are committed to protecting the information we collect. While no Website can guarantee absolute security, we have implemented appropriate administrative, technical, and physical security procedures to help protect the personal information you provide to us. To prevent unauthorized access, maintain data accuracy, and ensure correct use of information, we will employ reasonable and current Internet security methods and technologies.</p>

          <p>Any information which is specifically mentioned by us as Confidential shall be maintained confidentially by the user and shall not be disclosed unless as required by law or to serve the purpose of this agreement and the obligations of both the parties therein.</p>

          <p>If you are more comfortable with giving your credit card information over phone, you can call our Customer Service Centre on Toll Free number. If you have any additional queries or concerns, please <Link to="/contact-us" className="text-primary font-semibold hover:underline">Contact Us</Link>, and we will reply within 24 hours.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyStatementPage;
