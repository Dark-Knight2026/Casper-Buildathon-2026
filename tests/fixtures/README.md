# Test Fixtures

This directory contains sample files used for integration testing.

## Required Files

For the integration tests to run successfully, you need the following files:

### Images
- `faucet-leak.jpg` - Sample image for maintenance request testing

### Documents
- `drivers-license.pdf` - Sample ID document for tenant application
- `pay-stub.pdf` - Sample income proof for tenant application
- `lease-agreement.pdf` - Sample lease document
- `lease-agreement-v2.pdf` - Updated version of lease document
- `document1.pdf` - Sample document for bulk operations
- `document2.pdf` - Sample document for bulk operations
- `document3.pdf` - Sample document for bulk operations

### Error Testing
- `large-file.pdf` - File larger than 50MB for size validation testing
- `invalid.exe` - Invalid file format for format validation testing

## Creating Test Files

You can create simple test PDF files using:

```bash
# Create a simple text file and convert to PDF
echo "Test Document" > test.txt
# Use a PDF converter or online tool to create PDFs

# Or use ImageMagick to create test images
convert -size 800x600 xc:white -pointsize 20 -draw "text 100,100 'Test Image'" faucet-leak.jpg
```

## Note

These are placeholder files for testing purposes only. In a production environment, you would use actual sample documents that represent real-world scenarios.