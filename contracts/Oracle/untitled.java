interface State {
	public void newUser();
	public void registrationComplete();
	public void emailNotVerified();
	public void existingUser();
	public void selectProduct();
	public void chargeUser();
	public void paymentDeclined();
	public void logout();
}

abstract class StateImpl implements State {
	void enterState() {}
	void exitState() {}
	public void newUser() {}
	public void registrationComplete() {}
	public void emailNotVerified() {}
	public void existingUser() {}
	public void selectProduct() {}
	public void chargeUser() {}
	public void paymentDeclined() {}
	public void logout() {}
}

