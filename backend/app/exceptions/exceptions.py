class DuplicateCVException(Exception):
    """Exception levée lorsqu'un CV existe déjà dans la base de données"""
    def __init__(self, message: str, cv_id: str = None):
        self.message = message
        self.cv_id = cv_id  # ← Assurez-vous que cette ligne existe
        super().__init__(self.message)