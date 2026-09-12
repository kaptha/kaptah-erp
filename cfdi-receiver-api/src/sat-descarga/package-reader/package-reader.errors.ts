/** Equivale a PackageReader/Exceptions/*.php */
export class PackageReaderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OpenZipFileError extends PackageReaderError {}
