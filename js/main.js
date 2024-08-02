const INVOICE_ID = generateInvoiceId();
const TERMINAL = "8911a14f-61a3-4449-a1c1-7a314ee5774c";
const AMOUNT = 5.88;
const PAYMENT_DATA = getPaymentData();

const cardholderName = document.querySelector("#hf-name");
const cardNumber = document.querySelector("#hf-number");
const cardDate = document.querySelector("#hf-date");
const cardCvv = document.querySelector("#hf-cvv");

const threeDSecureModal = document.querySelector("#threeDSecureModal");
const threeDSecureModalContent = document.querySelector(
  "#threeDSecureModalContent"
);
const $threeDSecureModal = $(threeDSecureModal);

const payBtn = document.querySelector("#pay-btn");

let hf;
let attemptCount = 0,
  sendCallbackEveryFailedAttempt = 3;

fetchToken().then((result) => {
  $("#loader").hide();
  $("#payment-data").text(JSON.stringify(PAYMENT_DATA, null, 2));
  $("#hosted-fields").show();

  window.dnaPayments.hostedFields
    .create({
      isTest: true,
      accessToken: result.access_token,
      styles: {
        input: {
          "font-size": "14px",
          "font-family": "Open Sans",
        },
        ".valid": {
          color: "green",
        },
        ".invalid": {
          color: "red",
        },
      },
      threeDSecure: {
        container: threeDSecureModalContent,
      },
      sendCallbackEveryFailedAttempt,
      fontNames: ["Open Sans"],
      fields: {
        cardholderName: {
          container: cardholderName,
          placeholder: "Cardholder name",
        },
        cardNumber: {
          container: cardNumber,
          placeholder: "Card number",
        },
        expirationDate: {
          container: cardDate,
          placeholder: "Expiry date",
        },
        cvv: {
          container: cardCvv,
          placeholder: "CSC/CVV",
        },
      },
    })
    .then((res) => {
      hf = res;

      hf.on("dna-payments-three-d-secure-show", (data) => {
        console.log("show", data);
        $threeDSecureModal.modal("show");
      });

      hf.on("dna-payments-three-d-secure-hide", () => {
        console.log("hides");
        $threeDSecureModal.modal("hide");
      });
    })
    .catch((e) => {
      $("#errors").text(JSON.stringify(e, null, 2)).show();
    });

  payBtn.addEventListener("click", () => {
    startLoading();
    clear();
    // submits card data to pay
    hf.submit({ paymentData: PAYMENT_DATA })
      .then((res) => {
        stopLoading();
        hf.clear(); // Clears payment fields (Cardholder name, Credit card number, expiration date, cvv)
        showResult(true);
        console.log("res", res);
      })
      .catch((err) => {
        stopLoading();
        if (err.code === "NOT_VALID_CARD_DATA") {
          showResult(false, err.message);
        } else {
          attemptCount++;
          showResult(false, err.message);
          if (
            sendCallbackEveryFailedAttempt &&
            attemptCount >= sendCallbackEveryFailedAttempt
          ) {
            alert("Callback has been sent");
            attemptCount = 0;
          }
          hf.clear();
        }
        console.log("err", err);
      });
  });
});

async function fetchToken() {
  // Please use your own authentication endpoint to obtain a token (access_token)
  const response = await fetch(
    "https://test-api.dnapayments.com/v1/oauth2/test-token",
    {
      method: "POST",
      body: JSON.stringify({
        terminal: TERMINAL,
        invoiceId: INVOICE_ID,
        amount: AMOUNT,
        currency: "GBP",
        scope:
          "payment integration_hosted integration_embedded integration_seamless",
      }),
    }
  );
  return await response.json();
}

function startLoading() {
  $(payBtn).button("loading");
}

function stopLoading() {
  $(payBtn).button("reset");
}

function showResult(isSuccess, text) {
  if (isSuccess) {
    $("#failed").hide();
    $("#success").show();
  } else {
    $("#success").hide();
    $("#failed")
      .show()
      .html(text || "Payment was unsuccessfull");
  }
}

function clear() {
  $("#success").hide();
  $("#failed").hide();
  $("#errors").text("").hide();
}

function getPaymentData() {
  return {
    currency: "GBP",
    description: "Car Service",
    paymentSettings: {
      terminalId: TERMINAL,
      returnUrl: "https://test-pay.dnapayments.com/checkout/success.html",
      failureReturnUrl:
        "https://test-pay.dnapayments.com/checkout/failure.html",
      callbackUrl: "https://pay.dnapayments.com/checkout",
      failureCallbackUrl: "https://testmerchant/order/1123/fail",
    },
    customerDetails: {
      accountDetails: {
        accountId: "uuid000001",
      },
      billingAddress: {
        firstName: "John",
        lastName: "Doe",
        addressLine1: "Fulham Rd",
        postalCode: "SW6 1HS",
        city: "London",
        country: "GB",
      },
      deliveryDetails: {
        deliveryAddress: {
          firstName: "John",
          lastName: "Doe",
          addressLine1: "Fulham Rd",
          addressLine2: "Fulham",
          postalCode: "SW6 1HS",
          city: "London",
          phone: "0475662834",
          country: "GB",
        },
      },
      email: "demo@dnapayments.com",
    },
    deliveryType: "service",
    invoiceId: INVOICE_ID,
    amount: AMOUNT,
  };
}

function generateInvoiceId() {
  return new Date().getTime().toString();
}
