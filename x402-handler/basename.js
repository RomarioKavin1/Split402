
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
const abi = JSON.parse(
  readFileSync(new URL('./base.json', import.meta.url))
);

const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/oJTjnNCsJEOqYv3MMtrtT6LUFhwcW9pR');
const signer = new ethers.Wallet('9231a846e1011403d73d4b9ed7ffdd36b7926471982458e5554d0a4b31d8d75e', provider);

const registrarControllerAddress = '0x49aE3cC2e3AA768B1e5654f5D3C6002144A59581';
const registrarController = new ethers.Contract(
  registrarControllerAddress,
  abi,
  signer
);

async function registerDomain() {
  try {
    const name = 'philosanjay'; // Name without .base.eth
    const owner = await signer.getAddress(); // Use sender as owner
    const duration = 31536000; // 1 year in seconds
    const resolver = '0x6533c94869d28faa8df77cc63f9e2b2d6cf77eba'; // Example resolver
    const data = []; // Empty array if no resolver records to set
    const reverseRecord = true;

    // 1. Check name validity and availability
    const isValid = await registrarController.valid(name);
    if (!isValid) {
      throw new Error(`Name "${name}" is too short (min ${await registrarController.MIN_NAME_LENGTH()} chars)`);
    }

    const isAvailable = await registrarController.available(name);
    if (!isAvailable) {
      throw new Error(`Name "${name}" is not available`);
    }

    // 2. Check duration is sufficient
    const minDuration = await registrarController.MIN_REGISTRATION_DURATION();
    if (duration < minDuration) {
      throw new Error(`Duration too short (min ${minDuration} seconds)`);
    }

    // 3. Get price and add 10% buffer
    const price = await registrarController.registerPrice(name, duration);
    const priceWithBuffer = price// Add 10% buffer

    // 4. Prepare register request
    const registerRequest = {
      name,
      owner,
      duration,
      resolver,
      data,
      reverseRecord
    };

    console.log(`Registering "${name}" for ${ethers.formatEther(price)} ETH`);

    // 5. Estimate gas first


    // 6. Send transaction
    const tx = await registrarController.register(registerRequest, {
      value: priceWithBuffer,
      gasLimit: 500000 // Set appropriate gas limit
    });

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Confirmed in block:', receipt.blockNumber);

  } catch (error) {
    console.error('Registration failed:');
    
    // Try to decode custom errors
    if (error.data) {
      try {
        const decodedError = registrarController.interface.parseError(error.data);
        console.error('Custom error:', decodedError.name, decodedError.args);
      } catch (e) {
        console.error('Raw error data:', error.data);
      }
    }
    
    console.error(error.message || error);
  }
}

registerDomain();