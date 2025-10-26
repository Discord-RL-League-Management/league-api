export default async function globalTeardown() {
  // Leave container running for faster subsequent test runs
  // Developers can manually stop with: docker compose down postgres_test
  console.log('✅ Tests complete. Test database container left running for next run.');
  console.log('💡 To stop: docker compose down postgres_test');
}
