const BASE = process.env.PRODUCTION_BASE_URL || "https://fitness-la.vercel.app";
const USERNAME = process.env.PRODUCTION_OWNER_USERNAME || "phuwasit";
const PASSWORD = process.env.PRODUCTION_OWNER_PASSWORD || "phuwasit1!";

function formatData(data) {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

async function request(method, path, { body, cookies = "", headers = {} } = {}) {
  const finalHeaders = {
    Cookie: cookies,
    ...headers,
  };

  if (body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    redirect: "manual",
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text().catch(() => null);
  }

  return { status: response.status, data, headers: response.headers };
}

async function login() {
  const response = await fetch(`${BASE}/api/auth/sign-in/username`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    redirect: "manual",
  });

  const cookieHeader = response.headers.get("set-cookie") || "";
  const cookies = cookieHeader
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, cookies, data };
}

async function getActiveShiftId(cookies) {
  const activeShift = await request("GET", "/api/v1/shifts/active", { cookies });

  if (activeShift.status === 200 && activeShift.data?.shift_id) {
    return activeShift.data.shift_id;
  }

  const openShift = await request("POST", "/api/v1/shifts/open", {
    cookies,
    body: { starting_cash: 500 },
  });

  if ((openShift.status === 200 || openShift.status === 201) && openShift.data?.shift_id) {
    return openShift.data.shift_id;
  }

  throw new Error(`Cannot get active shift. active=${activeShift.status} ${formatData(activeShift.data)} open=${openShift.status} ${formatData(openShift.data)}`);
}

function pickProducts(products) {
  const goods = products.find((product) => product.product_type === "GOODS" && (product.stock_on_hand ?? 0) > 0);
  const membership = products.find((product) => product.product_type === "MEMBERSHIP");
  const training = products.find((product) => product.product_type === "SERVICE" && String(product.sku || "").startsWith("PT-"));

  return { goods, membership, training };
}

async function main() {
  console.log(`BASE=${BASE}`);

  const loginResult = await login();
  console.log(`LOGIN status=${loginResult.status} cookies=${loginResult.cookies ? "yes" : "no"}`);
  if (!loginResult.cookies) {
    console.log(`LOGIN_BODY=${formatData(loginResult.data)}`);
    process.exit(1);
  }

  const cookies = loginResult.cookies;
  const shiftId = await getActiveShiftId(cookies);
  console.log(`SHIFT_ID=${shiftId}`);

  const productsResponse = await request("GET", "/api/v1/products", { cookies });
  console.log(`PRODUCTS status=${productsResponse.status} count=${Array.isArray(productsResponse.data) ? productsResponse.data.length : "n/a"}`);
  if (productsResponse.status !== 200 || !Array.isArray(productsResponse.data)) {
    console.log(`PRODUCTS_BODY=${formatData(productsResponse.data)}`);
    process.exit(1);
  }

  const { goods, membership, training } = pickProducts(productsResponse.data);
  console.log(`PICK goods=${goods?.sku || "none"} membership=${membership?.sku || "none"} training=${training?.sku || "none"}`);

  const trainersResponse = await request("GET", "/api/v1/trainers", { cookies });
  const trainer = Array.isArray(trainersResponse.data) ? trainersResponse.data.find((item) => item.is_active !== false) : null;
  console.log(`TRAINERS status=${trainersResponse.status} picked=${trainer?.trainer_id || "none"}`);

  const cases = [];

  if (goods) {
    cases.push({
      label: "GOODS",
      body: {
        shift_id: shiftId,
        items: [{ product_id: goods.product_id, quantity: 1 }],
        payment_method: "CASH",
      },
    });
  }

  if (membership) {
    cases.push({
      label: "MEMBERSHIP_CASH",
      body: {
        shift_id: shiftId,
        items: [{ product_id: membership.product_id, quantity: 1 }],
        payment_method: "CASH",
        customer_info: {
          name: `SMOKE PROD MEMBER CASH ${Date.now()}`,
        },
      },
    });

    cases.push({
      label: "MEMBERSHIP_PROMPTPAY",
      body: {
        shift_id: shiftId,
        items: [{ product_id: membership.product_id, quantity: 1 }],
        payment_method: "PROMPTPAY",
        customer_info: {
          name: `SMOKE PROD MEMBER ${Date.now()}`,
        },
      },
    });
  }

  if (training && trainer) {
    cases.push({
      label: "PT_CASH",
      body: {
        shift_id: shiftId,
        items: [{ product_id: training.product_id, quantity: 1, trainer_id: trainer.trainer_id }],
        payment_method: "CASH",
        customer_info: {
          name: `SMOKE PROD TRAINING CASH ${Date.now()}`,
        },
      },
    });

    cases.push({
      label: "PT_CREDIT_CARD",
      body: {
        shift_id: shiftId,
        items: [{ product_id: training.product_id, quantity: 1, trainer_id: trainer.trainer_id }],
        payment_method: "CREDIT_CARD",
        customer_info: {
          name: `SMOKE PROD TRAINING ${Date.now()}`,
        },
      },
    });
  }

  for (const testCase of cases) {
    const result = await request("POST", "/api/v1/orders", {
      cookies,
      body: testCase.body,
    });

    console.log(`ORDER_CASE=${testCase.label}`);
    console.log(`STATUS=${result.status}`);
    console.log(`BODY=${formatData(result.data)}`);
  }
}

main().catch((error) => {
  console.error(`FATAL=${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
