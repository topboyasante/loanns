import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceImmutabilityOfFinalLoanStates1739813000000
  implements MigrationInterface
{
  name = 'EnforceImmutabilityOfFinalLoanStates1739813000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_update_loan_application_in_final_state()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.state IN ('APPROVED', 'REJECTED') THEN
          RAISE EXCEPTION 'Cannot update loan application in final state %', OLD.state;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER loan_applications_prevent_update_final_state
      BEFORE UPDATE ON loan_applications
      FOR EACH ROW
      EXECUTE FUNCTION prevent_update_loan_application_in_final_state()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS loan_applications_prevent_update_final_state ON loan_applications
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS prevent_update_loan_application_in_final_state()
    `);
  }
}
