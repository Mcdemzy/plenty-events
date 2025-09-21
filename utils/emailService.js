import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const message = {
      from: `"Plenty Events" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html || options.message,
      text: options.text,
    };

    const info = await transporter.sendMail(message);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    // Don't throw error to prevent breaking the main flow
    return null;
  }
};

// Welcome email template
export const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin-bottom: 10px;">Welcome to Plenty Events! 🎉</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Your account has been created successfully</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #34495e;">Hello ${user.firstName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Thank you for joining Plenty Events! We're excited to have you as part of our community.
          </p>
          
          ${
            user.role === "vendor"
              ? `
            <p style="color: #555; line-height: 1.6;">
              As a vendor, you can now showcase your services and connect with customers looking for quality event services.
              Your account is currently under review and will be approved within 24-48 hours.
            </p>
          `
              : user.role === "waiter"
              ? `
            <p style="color: #555; line-height: 1.6;">
              As a waiter, you can now find exciting job opportunities with top vendors in your area.
              Your account is currently under review and will be approved within 24-48 hours.
            </p>
          `
              : `
            <p style="color: #555; line-height: 1.6;">
              You can now explore and book amazing vendors for your events. From catering to decoration,
              we have everything you need to make your events memorable!
            </p>
          `
          }
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Get Started
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; text-align: center;">
          <p>Need help? Contact us at <a href="mailto:support@plentyevents.com" style="color: #3498db;">support@plentyevents.com</a></p>
          <p>© ${new Date().getFullYear()} Plenty Events. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Welcome to Plenty Events!",
    html,
  });
};

// Password reset email
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin-bottom: 10px;">🔒 Password Reset Request</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Reset your Plenty Events password</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #34495e;">Hello ${user.firstName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            You requested a password reset for your Plenty Events account. Click the button below to reset your password.
            This link will expire in 10 minutes.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. 
            Your password will remain unchanged.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; text-align: center;">
          <p>Need help? Contact us at <a href="mailto:support@plentyevents.com" style="color: #3498db;">support@plentyevents.com</a></p>
          <p>© ${new Date().getFullYear()} Plenty Events. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Password Reset Request - Plenty Events",
    html,
  });
};

// Booking confirmation email for users
export const sendBookingConfirmationEmail = async (user, booking, vendor) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #27ae60; margin-bottom: 10px;">✅ Booking Confirmed!</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Your event booking has been confirmed</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #34495e;">Hello ${user.firstName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Great news! Your booking with <strong>${
              vendor.businessName
            }</strong> has been confirmed.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Booking Details:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li><strong>Event:</strong> ${booking.eventTitle}</li>
            <li><strong>Date:</strong> ${new Date(
              booking.eventDate
            ).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${booking.startTime} - ${
    booking.endTime
  }</li>
            <li><strong>Guests:</strong> ${booking.guestCount}</li>
            <li><strong>Vendor:</strong> ${vendor.businessName}</li>
            <li><strong>Total Amount:</strong> ${
              booking.currency
            } ${booking.quotedPrice.toLocaleString()}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/bookings/${booking._id}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Booking Details
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; text-align: center;">
          <p>Questions about your booking? Contact us at <a href="mailto:support@plentyevents.com" style="color: #3498db;">support@plentyevents.com</a></p>
          <p>© ${new Date().getFullYear()} Plenty Events. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: `Booking Confirmed - ${booking.eventTitle}`,
    html,
  });
};

// New booking notification for vendors
export const sendNewBookingNotificationEmail = async (
  vendor,
  booking,
  user
) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f39c12; margin-bottom: 10px;">🔔 New Booking Request!</h1>
          <p style="color: #7f8c8d; font-size: 16px;">You have a new event booking request</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #34495e;">Hello ${vendor.user.firstName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            You have received a new booking request from <strong>${
              user.fullName
            }</strong> for your services.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Booking Details:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li><strong>Event:</strong> ${booking.eventTitle}</li>
            <li><strong>Date:</strong> ${new Date(
              booking.eventDate
            ).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${booking.startTime} - ${
    booking.endTime
  }</li>
            <li><strong>Guests:</strong> ${booking.guestCount}</li>
            <li><strong>Customer:</strong> ${user.fullName}</li>
            <li><strong>Contact:</strong> ${user.phone}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/vendor/orders/${booking._id}" 
             style="background-color: #f39c12; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Review Booking
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; text-align: center;">
          <p>Need help? Contact us at <a href="mailto:support@plentyevents.com" style="color: #3498db;">support@plentyevents.com</a></p>
          <p>© ${new Date().getFullYear()} Plenty Events. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    email: vendor.user.email,
    subject: `New Booking Request - ${booking.eventTitle}`,
    html,
  });
};

// Job offer email for waiters
export const sendJobOfferEmail = async (waiter, job, vendor) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #9b59b6; margin-bottom: 10px;">💼 New Job Offer!</h1>
          <p style="color: #7f8c8d; font-size: 16px;">You have a new job opportunity</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #34495e;">Hello ${waiter.user.firstName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            <strong>${
              vendor.businessName
            }</strong> has offered you a job opportunity. 
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Job Details:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li><strong>Position:</strong> ${job.position}</li>
            <li><strong>Date:</strong> ${new Date(
              job.workDate
            ).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${job.startTime} - ${job.endTime}</li>
            <li><strong>Rate:</strong> ${job.currency} ${
    job.hourlyRate
  }/hour</li>
            <li><strong>Vendor:</strong> ${vendor.businessName}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/waiter/jobs/${job._id}" 
             style="background-color: #9b59b6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 10px;">
            View Job Details
          </a>
        </div>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #155724; margin: 0; font-size: 14px;">
            <strong>Action Required:</strong> Please respond to this job offer as soon as possible. 
            Jobs are offered on a first-come, first-served basis.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; text-align: center;">
          <p>Questions? Contact us at <a href="mailto:support@plentyevents.com" style="color: #3498db;">support@plentyevents.com</a></p>
          <p>© ${new Date().getFullYear()} Plenty Events. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    email: waiter.user.email,
    subject: `New Job Offer - ${job.position}`,
    html,
  });
};

// Account approval email
export const sendAccountApprovalEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #27ae60; margin-bottom: 10px;">🎉 Account Approved!</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Your account has been approved</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #34495e;">Congratulations ${user.firstName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Your ${
              user.role
            } account has been approved and is now active. You can now access all features and start 
            ${
              user.role === "vendor"
                ? "receiving bookings from customers"
                : "applying for jobs with vendors"
            }.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Access Your Dashboard
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; text-align: center;">
          <p>Welcome to the Plenty Events community! Contact us at <a href="mailto:support@plentyevents.com" style="color: #3498db;">support@plentyevents.com</a></p>
          <p>© ${new Date().getFullYear()} Plenty Events. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Account Approved - Welcome to Plenty Events!",
    html,
  });
};

export default sendEmail;
