import secrets


def generate_meeting_id(length: int = 10) -> str:
    """Generate a unique numeric meeting ID
    
    Args:
        length: Number of digits in the meeting ID (default: 10)
    
    Returns:
        String representation of the meeting ID
    """
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def validate_meeting_id(meeting_id: str, length: int = 10) -> bool:
    """Validate meeting ID format
    
    Args:
        meeting_id: The meeting ID to validate
        length: Expected length of the meeting ID
    
    Returns:
        True if valid, False otherwise
    """
    if not meeting_id:
        return False
    if len(meeting_id) != length:
        return False
    if not meeting_id.isdigit():
        return False
    return True
