import algosdk from "algosdk";
import {
  algodClient,
  indexerClient,
  requestNote,
  minRound,
  myAlgoConnect,
  numGlobalBytes,
  numGlobalInts,
  numLocalBytes,
  numLocalInts,
} from "./constants";
import { create } from "ipfs-http-client";
/* eslint import/no-webpack-loader-syntax: off */
import approvalProgram from "!!raw-loader!../contracts/pet_shop_approval.teal";
import clearProgram from "!!raw-loader!../contracts/pet_shop_clear.teal";
import {
  base64ToUTF8String,
  stringToMicroAlgos,
  utf8ToBase64String,
} from "./conversions";

const authorization =
  "Basic " +
  Buffer.from(
    process.env.REACT_APP_PROJECT_ID +
      ":" +
      process.env.REACT_APP_PROJECT_SECRET
  ).toString("base64");

const client = create({
  url: "https://ipfs.infura.io:5001/api/v0",
  headers: {
    authorization,
  },
});

export const uploadToIpfs = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const added = await client.add(file, {
      progress: (prog) => console.log(`received: ${prog}`),
    });
    return `https://diac.infura-ipfs.io/ipfs/${added.path}`;
  } catch (error) {
    console.log("Error uploading file: ", error);
  }
};

class Request {
  constructor(title, image, description, price, sold, createdAt, appId, owner) {
    this.title = title;
    this.image = image;
    this.description = description;
    this.price = price;
    this.sold = sold;
    this.createdAt = createdAt;
    this.appId = appId;
    this.owner = owner;
  }
}

// Compile smart contract in .teal format to program
const compileProgram = async (programSource) => {
  let encoder = new TextEncoder();
  let programBytes = encoder.encode(programSource);
  let compileResponse = await algodClient.compile(programBytes).do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
};

// CREATE REQUEST: ApplicationCreateTxn
export const createRequestAction = async (senderAddress, request) => {
  console.log("Adding request...", request, senderAddress);

  let params = await algodClient.getTransactionParams().do();

  // Compile programs
  const compiledApprovalProgram = await compileProgram(approvalProgram);
  const compiledClearProgram = await compileProgram(clearProgram);

  // Build note to identify transaction later and required app args as Uint8Arrays
  let note = new TextEncoder().encode(requestNote);
  let title = new TextEncoder().encode(request.title);
  let image = new TextEncoder().encode(request.image);
  let description = new TextEncoder().encode(request.description);
  let createdAt = algosdk.encodeUint64(
    stringToMicroAlgos(String(request.createdAt))
  );
  let price = algosdk.encodeUint64(stringToMicroAlgos(request.price));

  let appArgs = [title, image, description, price, createdAt];

  // Create ApplicationCreateTxn
  let txn = algosdk.makeApplicationCreateTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: compiledApprovalProgram,
    clearProgram: compiledClearProgram,
    numLocalInts,
    numLocalByteSlices: numLocalBytes,
    numGlobalInts,
    numGlobalByteSlices: numGlobalBytes,
    note,
    appArgs,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get created application id and notify about completion
  let transactionResponse = await algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["application-index"];
  console.log("Created new app-id: ", appId);
  return appId;
};

// DONATE: Group transaction consisting of ApplicationCallTxn and PaymentTxn
export const buyPetAction = async (senderAddress, request, amount) => {
  console.log("Donating...");

  let params = await algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let buyArg = new TextEncoder().encode("buy");
  let appArgs = [buyArg];

  // Create ApplicationCallTxn
  let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: request.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs,
  });

  // Create PaymentTxn
  let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: request.owner,
    amount,
    suggestedParams: params,
  });

  let txnArray = [appCallTxn, paymentTxn];

  // Create group transaction out of previously build transactions
  let groupID = algosdk.computeGroupID(txnArray);
  for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

  // Sign & submit the group transaction
  let signedTxn = await myAlgoConnect.signTransaction(
    txnArray.map((txn) => txn.toByte())
  );
  console.log("Signed group transaction");
  let tx = await algodClient
    .sendRawTransaction(signedTxn.map((txn) => txn.blob))
    .do();

  // Wait for group transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);

  // Notify about completion
  console.log(
    "Group transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

// EDIT REQUEST: Edit existing request
export const editRequestAction = async (senderAddress, request) => {
  console.log("Editing request...", request);

  let params = await algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let editArg = new TextEncoder().encode("edit");
  let title = new TextEncoder().encode(request.title);
  let image = new TextEncoder().encode(request.image);
  let description = new TextEncoder().encode(request.description);
  let price = algosdk.encodeUint64(stringToMicroAlgos(request.price));

  let appArgs = [editArg, title, image, description, price];

  // Create ApplicationCallTxn
  let txn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: request.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

// DELETE REQUEST: ApplicationDeleteTxn
export const deleteRequestAction = async (senderAddress, index) => {
  console.log("Deleting application...");

  let params = await algodClient.getTransactionParams().do();

  // Create ApplicationDeleteTxn
  let txn = algosdk.makeApplicationDeleteTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    appIndex: index,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get application id of deleted application and notify about completion
  let transactionResponse = await algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["txn"]["txn"].apid;
  console.log("Deleted app-id: ", appId);
};

// GET REQUESTS: Use indexer
export const getRequestsAction = async () => {
  console.log("Fetching requests...");
  let note = new TextEncoder().encode(requestNote);
  let encodedNote = Buffer.from(note).toString("base64");

  // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
  let transactionInfo = await indexerClient
    .searchForTransactions()
    .notePrefix(encodedNote)
    .txType("appl")
    .minRound(minRound)
    .do();
  let requests = [];
  for (const transaction of transactionInfo.transactions) {
    let appId = transaction["created-application-index"];
    if (appId) {
      // Step 2: Get each application by application id
      let request = await getApplication(appId);
      if (request) {
        requests.push(request);
      }
    }
  }
  console.log("Requests fetched.");
  return requests;
};

const getApplication = async (appId) => {
  try {
    // 1. Get application by appId
    let response = await indexerClient
      .lookupApplications(appId)
      .includeAll(true)
      .do();
    if (response.application.deleted) {
      return null;
    }
    let globalState = response.application.params["global-state"];

    // 2. Parse fields of response and return request
    let owner = response.application.params.creator;
    let title = "";
    let image = "";
    let description = "";
    let price = 0;
    let sold = 0;
    let createdAt = 0;

    const getField = (fieldName, globalState) => {
      return globalState.find((state) => {
        return state.key === utf8ToBase64String(fieldName);
      });
    };

    if (getField("TITLE", globalState) !== undefined) {
      let field = getField("TITLE", globalState).value.bytes;
      title = base64ToUTF8String(field);
    }

    if (getField("IMAGE", globalState) !== undefined) {
      let field = getField("IMAGE", globalState).value.bytes;
      image = base64ToUTF8String(field);
    }

    if (getField("DESCRIPTION", globalState) !== undefined) {
      let field = getField("DESCRIPTION", globalState).value.bytes;
      description = base64ToUTF8String(field);
    }

    if (getField("PRICE", globalState) !== undefined) {
      price = getField("PRICE", globalState).value.uint;
    }

    if (getField("SOLD", globalState) !== undefined) {
      sold = getField("SOLD", globalState).value.uint;
    }

    if (getField("CREATED_AT", globalState) !== undefined) {
      createdAt = getField("CREATED_AT", globalState).value.uint;
    }

    return new Request(
      title,
      image,
      description,
      price,
      sold,
      createdAt,
      appId,
      owner
    );
  } catch (err) {
    return null;
  }
};
