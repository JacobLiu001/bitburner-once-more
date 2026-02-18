/**
 * This file is the PurchasedSERVerDaemon (pservd). This, when run
 * without the oneshot flag, will keep running in the background trying to
 * purchase and upgrade p-servers. */

import { NS, AutocompleteData } from "@ns";

const POLL_INTERVAL = 10_000;
const MAX_PURCHASED_SERVERS = 25;

const argsSchema: [string, string | boolean][] = [["oneshot", false]];

export function autocomplete(data: AutocompleteData, args: string[]) {
  data.flags(argsSchema);
  return [];
}

const ALLOWED_RAM = Array.from({ length: 20 }, (_, i) => 2 ** (i + 1));

/** Buys as many min-spec (2G) servers as we can.
 *
 * @returns true if we hit the max server limit, false otherwise (we ran out of
 * money)
 */
export function buyMinServer(ns: NS) {
  // we buy min spec servers. Early-game this might waste some money but we have
  // the casino so it's probably fine

  while (true) {
    const pServCount = ns.getPurchasedServers().length;
    if (pServCount >= MAX_PURCHASED_SERVERS) {
      return true;
    }
    const amount = 2;
    const hostname = `pserv-${pServCount}`;
    if (ns.purchaseServer(hostname, amount)) {
      ns.tprint(`INFO: Bought server ${hostname} with ${amount}GB RAM`);
    } else {
      return false;
    }
  }
}

/** Upgrades as much as we can, starting with the server with the least RAM.
 *
 * @returns true if all servers are maxed out, false otherwise
 */
export function upgradeAllAvailable(ns: NS) {
  while (true) {
    const pServ = ns.getPurchasedServers();
    const pServRam = pServ.map(ns.getServerMaxRam);
    const minRam = Math.min(...pServRam);

    if (minRam >= ALLOWED_RAM.at(-1)!) {
      return true;
    }

    const nextRam = ALLOWED_RAM.find((r) => r > minRam)!;

    // find the first server with minRam and upgrade it
    const idx = pServRam.findIndex((r) => r === minRam)!;
    const server = pServ[idx];
    if (ns.upgradePurchasedServer(server, nextRam)) {
      ns.tprint(`INFO: Upgraded server ${server} to ${nextRam}GB RAM`);
    } else {
      return false;
    }
  }
}

async function maximizeTotalNaive(ns: NS) {
  while (ns.getPurchasedServers().length < MAX_PURCHASED_SERVERS) {
    buyMinServer(ns);
    await ns.sleep(POLL_INTERVAL);
  }

  // now we have max purchased servers. Loop until we max out all of them.
  while (!upgradeAllAvailable(ns)) {
    await ns.sleep(POLL_INTERVAL);
  }
}

export function oneshot(ns: NS) {
  buyMinServer(ns);
  upgradeAllAvailable(ns);
}

export async function main(ns: NS) {
  const flags = ns.flags(argsSchema);

  if (flags.oneshot) {
    oneshot(ns);
  } else {
    await maximizeTotalNaive(ns);
  }
}
