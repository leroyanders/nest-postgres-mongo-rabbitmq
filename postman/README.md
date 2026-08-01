# Postman Collection

## Import

1. Open Postman → **Import** and drop both files:
   - `postgres-practice.postman_collection.json`
   - `local.postman_environment.json`
2. Select the **`postgres-practice — Local`** environment in the top-right corner.
3. Make sure the API is running (`yarn start:dev`, defaults to `http://localhost:3000/api`).

## How it works

- The collection uses **Bearer auth at the collection level** with `{{accessToken}}` — every protected request inherits it, public endpoints are marked with *No Auth*.
- **Sign Up / Sign In / Refresh** automatically store `accessToken` and `refreshToken` into the active environment (or collection variables when no environment is selected).
- Create-requests capture ids into variables: `addressId`, `storeId`, `storeSlug`, `categoryId`, `productId`, `variantId`, `stockId`, `cartId`, `cartItemId`, `orderId`, `orderItemId`, `paymentId`, `reviewId`. Follow-up requests reference them, so no manual copy-pasting is needed.

## Happy path

Run these requests in order to walk the full commerce loop with a single user acting as both seller and buyer:

| # | Request | Effect |
| --- | --- | --- |
| 1 | Auth → **Sign Up** | Account + profile + wallet, tokens saved |
| 2 | Addresses → **Create Address** | Delivery address saved |
| 3 | Wallet → **Deposit** | Wallet funded |
| 4 | Stores → **Create Store** → **Activate Store** | Store goes `DRAFT → ACTIVE` |
| 5 | Categories → **Create Category** | Category for the product |
| 6 | Products → **Create Product** → **Update Product (set ACTIVE)** | Product published |
| 7 | Stocks → **Adjust Stock (INCOME)** | 100 units on hand |
| 8 | Carts → **Add Item** | Cart with 2 units |
| 9 | Orders → **Checkout** | `PENDING` order, stock reserved, cart cleared |
| 10 | Payments → **Pay Order (wallet)** | Wallet debited, ledger entry written |
| 11 | Orders → **Update Order Status (seller)** | `ACCEPTED` → `PROCESSING` → `IN_DELIVERY` → `DELIVERED` (edit the body between sends) |
| 12 | Orders → **Complete My Order** | `DELIVERED → COMPLETED` |
| 13 | Reviews → **Create Review** | Review on the purchased item |

Detours worth trying:

- **Cancel My Order** right after checkout (while `PENDING`) — releases the stock reservation and refunds the wallet payment; check Wallet → **List Transactions** for the `REFUND` ledger entry.
- Re-send **Pay Order** with the same `idempotencyKey` — the existing payment is returned instead of a double charge.
- Stocks → **Stock Movements** after each order transition — `RESERVE`, then `SALE` (on delivery) or `RELEASE` (on cancel).
