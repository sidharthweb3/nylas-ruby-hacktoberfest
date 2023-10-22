const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeviceShare Contract", function () {
  let deviceShareContract;
  let deployer;
  let user1;
  let user2;
  let tokenContract;

  const FIXED_STAKE = ethers.utils.parseUnits("0.5");

  before(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy an ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("YourERC20Token"); // Replace with your ERC20 token contract
    tokenContract = await TokenFactory.deploy();
    await tokenContract.deployed();

    // Deploy the DeviceShare contract
    const DeviceShareFactory = await ethers.getContractFactory("DeviceShare");
    deviceShareContract = await DeviceShareFactory.deploy(
      tokenContract.address,
      FIXED_STAKE,
      deployer.address
    );
    await deviceShareContract.deployed();
  });

  it("Should deploy the DeviceShare contract", async function () {
    expect(deviceShareContract.address).to.not.be.undefined;
  });

  it("Should have the correct owner", async function () {
    const owner = await deviceShareContract.owner();
    expect(owner).to.equal(deployer.address);
  });

  it("Should allow users to add devices", async function () {
    // User 1 adds a device
    await deviceShareContract.connect(user1).addDevice(
      "Device1",
      10,
      4,
      "URI1",
      24,
      1
    );

    // Check if the device is listed
    const [devices] = await deviceShareContract.getAllDevices();
    expect(devices).to.include("Device1");
  });

  it("Should verify and list devices correctly", async function () {
    // User 1 adds a device
    await deviceShareContract.connect(user1).addDevice(
      "Device2",
      8,
      2,
      "URI2",
      12,
      2
    );

    // Deployer verifies and lists Device1
    await deviceShareContract.verifyProvider(1);
    await deviceShareContract.connect(deployer).listDevice(1);

    // Check if Device1 is listed and Device2 is not
    const [devices] = await deviceShareContract.getAllDevices();
    expect(devices).to.include("Device1");
    expect(devices).to.not.include("Device2");
  });

  it("Should handle device requests correctly", async function () {
    // User 2 requests to use Device1
    await deviceShareContract.connect(user2).RequestDeviceUse(1, 12);

    // Deployer accepts the request
    await deviceShareContract.connect(deployer).AcceptDeviceRequestByProvider(1);

    // User 2 should be able to cancel the request
    await deviceShareContract.connect(user2).cancelRequest(1);
    const request = await deviceShareContract.requests(1);
    expect(request.cancelRequest).to.equal(true);
  });

  it("Should transfer earned tokens correctly", async function () {
    // User 2 requests to use Device1 again
    await deviceShareContract.connect(user2).RequestDeviceUse(1, 6);

    // Deployer accepts the request
    await deviceShareContract.connect(deployer).AcceptDeviceRequestByProvider(2);

    // Simulate the passage of time (e.g., 1 hour)
    await ethers.provider.send("evm_increaseTime", [3600]);

    // User 2 cancels the request
    await deviceShareContract.connect(user2).cancelRequest(2);

    // User 2 can withdraw tokens earned
    await deviceShareContract.connect(user2).TransferTokenToRequestor(2);

    // Check if the requestor's paid tokens total is zero
    const requestor = await deviceShareContract.requestors(user2.address);
    expect(requestor.paidTokensTotal).to.equal(0);
  });

  // Add more test cases as needed
});
