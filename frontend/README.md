# Cinema Booking Frontend

React + Vite frontend for the deployed Cinema Booking API.

## Backend
The default API URL is already configured for the deployed Azure Front Door backend:

`https://cinema-backend-endpoint-f0cfdnhjb7heanfg.z03.azurefd.net`

You can override it with `VITE_API_BASE_URL`.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The static site is generated in `dist/`. Upload the **contents** of `dist/` to the Azure Storage `$web` container.

## Current scope

- Sign up / sign in / logout
- JWT access token stored in browser localStorage
- Browse movies
- Movie details
- Browse showtimes
- Seat availability and seat selection
- Create a reservation / seat hold
- View the user's bookings
- Responsive mobile layout

## Important payment note

The backend exposes Stripe PaymentIntent creation, but the current project uses dummy Stripe credentials. This frontend therefore stops at reservation/seat hold rather than pretending a payment succeeded. Stripe Elements can be added once a real/test Stripe publishable key and working backend Stripe configuration are supplied.
