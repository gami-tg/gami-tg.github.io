window.addEventListener('load', async () => {
  resetPage();
});

function resetPage() {
  //document.getElementById('buttonPrivateKeyOK').style.visibility = 'hidden';

  document.getElementById('buttonSelectFile').style.visibility = 'hidden';

  document.getElementById('buttonDownload').style.visibility = 'hidden';
  document.getElementById('buttonReset').style.visibility = 'hidden';

  document.getElementById('output').innerText = "";
  document.getElementById('textAddress').innerText = "";
  window.outputJson = null;
}

function loadPrivateKey() {
  resetPage();

  const privateKey = document.getElementById("inputPrivateKey").value;
  signerWallet = new ethers.Wallet(privateKey, ethers.getDefaultProvider());

  document.getElementById('textAddress').innerText = "address: " + signerWallet.address;
  document.getElementById('buttonSelectFile').style.visibility = 'visible';
}

function parseCsv(text) {
  const lines = text.split('\n');

  var addressToAmount = {}

  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim() == "")
      continue;


    // parse line & trim spaces
    var x = lines[i].split(";");
    for (var j = 0 ; j < x.length ; j++)
      x[j] = x[j].trim();

    const address = ethers.utils.getAddress(x[0]).toLowerCase();

    // sum amounts
    let amounts = x.slice(1);
    var amount = ethers.BigNumber.from("0");
    for (var j = 0 ; j < amounts.length ; j++) {
      const x = ethers.utils.parseEther(amounts[j].replace(",", ""));
      amount = amount.add(x);
    }

    if (address in addressToAmount) {
      console.log("duplicate address:", address);
      addressToAmount[address] = addressToAmount[address].add(amount);
    } else {
      addressToAmount[address] = amount;
    }

    // console.log(address, totalAmount.toString());

  }

  var outList = []
  for (var address in addressToAmount) {
    outList.push(
      [address, addressToAmount[address].toString()]
    );
  }

  console.log(outList);

  return outList;
}


async function signToken(_signerWallet, _address, claimAmount) {
  let messageHash = ethers.utils.solidityKeccak256(['address', 'uint256'],
  [_address,claimAmount]);
  let messageHashBinary = ethers.utils.arrayify(messageHash);
  let signatureRet = await _signerWallet.signMessage(messageHashBinary);
  // console.log("signatureRet", signatureRet);
  return (signatureRet);
}


async function signClaimList(signAddressList) {
  let ret = [];

  const privateKey = document.getElementById("inputPrivateKey").value;
  signerWallet = new ethers.Wallet(privateKey, ethers.getDefaultProvider());

  for (let i = 0 ; i < signAddressList.length ; i++) {
    const address = signAddressList[i][0];
    const amount = signAddressList[i][1];
    let sig = await signToken(signerWallet, address, amount);

    // console.log(address, amount.toString(), sig);
    ret.push({
      "address": address.toString(),
      "amount": amount.toString(),
      "sig": sig
    });

  }
  return ret;
}

function downloadClaimList() {
  const fileName = "ClaimList.json";

  const text = JSON.stringify({"claimList": window.claimListJson}, null, 4);

  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', fileName);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function showClaimList() {
  document.getElementById('buttonDownload').style.visibility = 'visible';
  document.getElementById('buttonReset').style.visibility = 'visible';
  const claimListJson = window.claimListJson;

  var str = "<table>";
  str += "<tr><td><b>address</b></td><td><b>amount</b></td><td><b>signature</b></td></tr>"
  for (var i = 0 ; i < claimListJson.length ; i++) {
    str += "<tr><td>" + claimListJson[i]['address'] + "</td><td>" + claimListJson[i]['amount'] + "</td><td>" + claimListJson[i]['sig'] + "</td></tr>";
  }
  str += "</table>";

  var node = document.getElementById('output');

  node.innerHTML = str;
}


async function csvFileSelected(event) {
  var input = event.target;

  var reader = new FileReader();
  reader.onload = async function() {
    var list = parseCsv(reader.result);

    window.claimListJson = await signClaimList(list);

    showClaimList();

  };
  reader.readAsText(input.files[0]);

}
