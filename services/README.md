# Global Services Directory

This directory contains definitions and instantiations of global services for the **OpsPilot AI** application, such as:
- External API client configurations
- Third-party SaaS integrations (e.g., Stripe, Resend)
- Logging or telemetry setups

## Guidelines
- Write services as modular singletons or clean classes.
- Ensure credentials and configs are loaded from environment variables.
- Feature-specific API clients or integrations should go under their respective feature directories.
