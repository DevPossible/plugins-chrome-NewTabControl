/**
 * A minimal ZIP writer.
 *
 * The Chrome Web Store wants a plain deflate ZIP and nothing more, so this
 * exists instead of a dependency. An extension that markets itself on being a
 * safe alternative should not pull an npm tree into its release pipeline.
 */

import { crc32, deflateRawSync } from 'node:zlib';

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;

// MS-DOS date/time. Fixed at 1980-01-01 so the archive is byte-reproducible.
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

function entryBuffers(name, contents) {
  const nameBytes = Buffer.from(name, 'utf8');
  const deflated = deflateRawSync(contents, { level: 9 });
  // Deflate can inflate tiny/incompressible files; fall back to stored.
  const useStore = deflated.length >= contents.length;
  const data = useStore ? contents : deflated;
  const method = useStore ? 0 : 8;
  const checksum = crc32(contents);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(LOCAL_HEADER, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(contents.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28); // extra length

  return { nameBytes, data, method, checksum, rawSize: contents.length, local };
}

/**
 * @param {Array<{name: string, contents: Buffer}>} files
 * @returns {Buffer}
 */
export function createZip(files) {
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const entry = entryBuffers(file.name, file.contents);

    parts.push(entry.local, entry.nameBytes, entry.data);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(CENTRAL_HEADER, 0);
    header.writeUInt16LE(20, 4); // version made by
    header.writeUInt16LE(20, 6); // version needed
    header.writeUInt16LE(0, 8); // flags
    header.writeUInt16LE(entry.method, 10);
    header.writeUInt16LE(DOS_TIME, 12);
    header.writeUInt16LE(DOS_DATE, 14);
    header.writeUInt32LE(entry.checksum, 16);
    header.writeUInt32LE(entry.data.length, 20);
    header.writeUInt32LE(entry.rawSize, 24);
    header.writeUInt16LE(entry.nameBytes.length, 28);
    header.writeUInt16LE(0, 30); // extra
    header.writeUInt16LE(0, 32); // comment
    header.writeUInt16LE(0, 34); // disk number
    header.writeUInt16LE(0, 36); // internal attrs
    header.writeUInt32LE(0, 38); // external attrs
    header.writeUInt32LE(offset, 42);

    central.push(header, entry.nameBytes);
    offset += entry.local.length + entry.nameBytes.length + entry.data.length;
  }

  const centralBuffer = Buffer.concat(central);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL, 0);
  end.writeUInt16LE(0, 4); // disk
  end.writeUInt16LE(0, 6); // start disk
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...parts, centralBuffer, end]);
}
