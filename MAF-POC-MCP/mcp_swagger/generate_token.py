from azure.identity import ClientSecretCredential

def generate_token() -> str:
    """
    Generate an Azure AD token using ClientSecretCredential.
    
    Returns:
        str: The generated token.
    """
    AZ_TENANT_ID = ""
    AZ_CLIENT_ID = ""
    AZ_CLIENT_SECRET = ""
    token = (
        ClientSecretCredential(AZ_TENANT_ID, AZ_CLIENT_ID, AZ_CLIENT_SECRET)
        .get_token(f"{AZ_CLIENT_ID}/.default")
        .token
    )
    print(token)
    return token

generate_token()